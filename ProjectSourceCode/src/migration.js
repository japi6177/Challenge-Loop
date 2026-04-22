const fs = require('fs');
const path = require('path');

async function getInformationSchema(db, schemaName) {
    const columns = await db.any(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1
    `, [schemaName]);
    
    const tables = {};
    for (const col of columns) {
        if (!tables[col.table_name]) {
            tables[col.table_name] = {};
        }
        tables[col.table_name][col.column_name] = col.data_type;
    }
    return tables;
}

async function runSQLFile(db, filename) {
    const sqlPath = path.join(__dirname, 'init_data', filename);
    if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await db.none(sql);
        return true;
    }
    return false;
}

async function recreateDatabase(db) {
    console.log('[Migration] Recreating database from scratch...');
    // Drop existing known tables to be safe, cascading.
    // If we want to be foolproof, we can query information_schema to drop all public tables dynamically.
    const tables = await db.any(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type IN ('BASE TABLE', 'VIEW')
    `);
    
    for (const t of tables) {
        // Cascade removes dependencies easily
        await db.none(`DROP TABLE IF EXISTS public."${t.table_name}" CASCADE`);
        await db.none(`DROP VIEW IF EXISTS public."${t.table_name}" CASCADE`);
    }
    
    console.log('  ✔ Dropped old schema');
    await runSQLFile(db, 'create.sql');
    console.log('  ✔ create.sql executed');
    try {
        await runSQLFile(db, 'insert.sql');
        console.log('  ✔ insert.sql executed');
    } catch (e) {
        console.log('  i No insert.sql found or error running it:', e.message);
    }
}

async function runMigrations(db, strategyString) {
    const strategy = parseInt(strategyString, 10);
    
    // Check if db is empty
    const tableExists = await db.oneOrNone(`SELECT to_regclass('public.users') AS exists`);
    if (!tableExists || !tableExists.exists) {
        console.log('[Migration] Database is empty - initializing fresh.');
        await recreateDatabase(db);
        return;
    }

    if (strategy === 0 || isNaN(strategy)) {
        console.log('[Migration] Strategy 0 (or null): Skipping migration checks.');
        return;
    }

    console.log(`[Migration] Strategy ${strategy}: Verifying schema...`);

    // Create temp schema and run create.sql there
    await db.none('DROP SCHEMA IF EXISTS __schema_temp CASCADE;');
    await db.none('CREATE SCHEMA __schema_temp;');
    
    try {
        await db.none('SET search_path TO __schema_temp;');
        await runSQLFile(db, 'create.sql');
    } catch (err) {
        console.error('[Migration] Failed to execute create.sql into __schema_temp:', err.message);
        await db.none('SET search_path TO public;');
        return;
    }
    
    await db.none('SET search_path TO public;');

    const publicSchema = await getInformationSchema(db, 'public');
    const targetSchema = await getInformationSchema(db, '__schema_temp');

    await db.none('DROP SCHEMA __schema_temp CASCADE;');

    let needsRecreation = false;
    const addColumnQueries = [];

    // Compare schemas
    for (const tableName in targetSchema) {
        if (!publicSchema[tableName]) {
            console.log(`[Migration] New table detected: ${tableName}`);
            // Can't easily merge a whole new table without extracting specific CREATE statements, 
            // so we revert to wiping/recreate. 
            needsRecreation = true;
            break;
        } else {
            // Table exists, check columns
            for (const colName in targetSchema[tableName]) {
                const targetType = targetSchema[tableName][colName];
                const publicType = publicSchema[tableName][colName];

                if (!publicType) {
                    console.log(`[Migration] Missing column detected: ${tableName}.${colName} (${targetType})`);
                    if (strategy === 2) {
                        needsRecreation = true;
                        break;
                    } else if (strategy === 1) {
                        // We do not know modifiers like UNIQUE or NOT NULL from information_schema easily,
                        // so ALTER TABLE might fail if it's NOT NULL without a DEFAULT.
                        addColumnQueries.push(`ALTER TABLE public."${tableName}" ADD COLUMN "${colName}" ${targetType};`);
                    }
                } else if (publicType !== targetType) {
                    // Soften postgres alias differences (e.g. character varying -> varchar)
                    const pType = publicType.toLowerCase();
                    const tType = targetType.toLowerCase();
                    const isTypeChangeMajor = !(
                        (pType.includes('char') && tType.includes('text')) ||
                        (pType.includes('text') && tType.includes('char')) ||
                        (pType === 'numeric' && tType === 'numeric')
                    );

                    if (pType !== tType && isTypeChangeMajor) {
                        console.log(`[Migration] Unmergeable column type mismatch for ${tableName}.${colName}: Expected ${targetType}, got ${publicType}`);
                        needsRecreation = true;
                        break;
                    }
                }
            }
        }
        if (needsRecreation) break;
    }

    if (!needsRecreation) {
        for (const tableName in publicSchema) {
            if (!targetSchema[tableName]) {
                console.log(`[Migration] Deleted table detected: ${tableName}`);
                // Deletions are considered unmergeable or trigger Strategy 2
                if (strategy === 1 || strategy === 2) {
                    needsRecreation = true;
                    break;
                }
            } else {
                for (const colName in publicSchema[tableName]) {
                    if (!targetSchema[tableName][colName]) {
                        console.log(`[Migration] Deleted column detected: ${tableName}.${colName}`);
                        // Deleting columns is unmergeable or triggers Strategy 2
                        if (strategy === 1 || strategy === 2) {
                            needsRecreation = true;
                            break;
                        }
                    }
                }
            }
            if (needsRecreation) break;
        }
    }

    if (needsRecreation) {
        console.log('[Migration] Differences found requiring strict recreation (or Strategy 2). Wiping db...');
        await recreateDatabase(db);
    } else if (addColumnQueries.length > 0) {
        console.log(`[Migration] Merging ${addColumnQueries.length} missing columns...`);
        for (const query of addColumnQueries) {
            try {
                await db.none(query);
                console.log(`  ✔ Executed: ${query}`);
            } catch(e) {
                console.error(`[Migration] Error adding column (${query}):`, e.message);
                console.log('[Migration] Mismatch was unmergeable. Falling back to recreate...');
                await recreateDatabase(db);
                break;
            }
        }
    } else {
        console.log('[Migration] Database schema is up to date.');
    }
}

module.exports = { runMigrations };
