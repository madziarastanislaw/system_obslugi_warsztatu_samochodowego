const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    user: '---',
    host: 'localhost',
    database: '---',
    password: '---',
    port: ____,
});

const PORT = ____;
const SCHEMA = 'warsztat';

pool.connect((err) => {
    if (err) console.error('Błąd połączenia z Postgres:', err.stack);
    else console.log('Połączono z PostgreSQL');
});

app.post('/api/register', async (req, res) => {
    const { login, haslo, rola } = req.body;

    try {
        const checkUser = await pool.query(
            `SELECT * FROM ${SCHEMA}.dane_logowania WHERE login = $1`,
            [login]
        );

        if (checkUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Ten login jest już zajęty' });
        }

        // 2. Wstawienie nowego użytkownika
        const result = await pool.query(
            `INSERT INTO ${SCHEMA}.dane_logowania (login, haslo, rola) VALUES ($1, $2, $3) RETURNING login, rola`,
            [login, haslo, rola]
        );

        res.status(201).json({
            success: true,
            message: 'Konto zostało utworzone',
            user: result.rows[0]
        });

    } catch (err) {
        console.error('Błąd rejestracji:', err.message);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

app.post('/api/login', async (req, res) => {
    const { login, haslo } = req.body;
    try {
        const result = await pool.query(
            `SELECT login, rola FROM ${SCHEMA}.dane_logowania WHERE login = $1 AND haslo = $2`,
            [login, haslo]
        );

        if (result.rows.length > 0) {
            res.json({
            token: "fake-jwt-token-123",
            rola: result.rows[0].rola
        });

        } else {
            res.status(401).json({ success: false, message: 'Błędne dane' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Błąd bazy' });
    }
});

app.post('/api/parts', async (req, res) => {
    const { name, price } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO ${SCHEMA}.czesci (nazwa, cena) VALUES ($1, $2) RETURNING *`,
            [name, price]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Database error: " + err.message });
    }
});

app.post('/api/services', async (req, res) => {
    const { name, duration, price } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO ${SCHEMA}.usluga (nazwa, czas, cena) VALUES ($1, $2, $3) RETURNING *`,
            [name, duration, price]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Database error: " + err.message });
    }
});

app.get('/api/parts', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    try {
        const countRes = await pool.query(`SELECT COUNT(*) FROM ${SCHEMA}.czesci`);
        const result = await pool.query(
            `SELECT * FROM ${SCHEMA}.czesci ORDER BY nazwa LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        res.json({
            data: result.rows,
            total: parseInt(countRes.rows[0].count),
            page,
            limit
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/services', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    try {
        const countRes = await pool.query(`SELECT COUNT(*) FROM ${SCHEMA}.usluga`);
        const result = await pool.query(
            `SELECT * FROM ${SCHEMA}.usluga ORDER BY nazwa LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        res.json({
            data: result.rows,
            total: parseInt(countRes.rows[0].count),
            page,
            limit
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/parts/:name', async (req, res) => {
    const { name } = req.params;
    try {
        const result = await pool.query(
            `DELETE FROM ${SCHEMA}.czesci WHERE nazwa = $1 RETURNING *`,
            [name]
        );
        if (result.rowCount > 0) {
            res.json({ success: true, message: `Usunięto część: ${name}` });
        } else {
            res.status(404).json({ error: "Nie znaleziono części o tej nazwie" });
        }
    } catch (err) {
        res.status(500).json({ error: "Błąd bazy: " + err.message });
    }
});

app.delete('/api/services/:name', async (req, res) => {
    const { name } = req.params;
    try {
        const result = await pool.query(
            `DELETE FROM ${SCHEMA}.usluga WHERE nazwa = $1 RETURNING *`,
            [name]
        );
        if (result.rowCount > 0) {
            res.json({ success: true, message: `Usunięto usługę: ${name}` });
        } else {
            res.status(404).json({ error: "Nie znaleziono usługi o tej nazwie" });
        }
    } catch (err) {
        res.status(500).json({ error: "Błąd bazy: " + err.message });
    }
});

app.post('/api/tickets', async (req, res) => {
    const { imie, nazwisko, startTime, opis } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const clientRes = await client.query(
            `INSERT INTO ${SCHEMA}.dane_klienta (imie, nazwisko) VALUES ($1, $2) RETURNING id_klienta`,
            [imie, nazwisko]
        );
        const clientId = clientRes.rows[0].id_klienta;

        await client.query(
            `INSERT INTO ${SCHEMA}.rezerwacje (id_klienta, data_rezerwacji, opis, status)
             VALUES ($1, $2, $3, 'oczekuje')`,
            [clientId, startTime, opis]
        );

        await client.query('COMMIT');
        res.status(201).json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Błąd bazy danych" });
    } finally {
        client.release();
    }
});

app.post('/api/clients', async (req, res) => {
    const { imie, nazwisko } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO ${SCHEMA}.dane_klienta (imie, nazwisko) VALUES ($1, $2) RETURNING *`,
            [imie, nazwisko]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Błąd bazy danych: " + err.message });
    }
});

app.get('/api/clients', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    try {
        const countRes = await pool.query(`SELECT COUNT(*) FROM ${SCHEMA}.dane_klienta`);
        const result = await pool.query(
            `SELECT * FROM ${SCHEMA}.dane_klienta ORDER BY nazwisko LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        res.json({
            data: result.rows,
            total: parseInt(countRes.rows[0].count),
            page,
            limit
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reservations', async (req, res) => {
    const { id_klienta, data_rezerwacji, opis } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO ${SCHEMA}.rezerwacje (id_klienta, data_rezerwacji, opis, status)
             VALUES ($1, $2, $3, 'oczekuje') RETURNING *`,
            [id_klienta, data_rezerwacji, opis]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Błąd bazy danych: " + err.message });
    }
});

app.get('/api/reservations', async (req, res) => {
    const { date } = req.query;
    try {
        const result = await pool.query(
            `SELECT r.*, k.imie, k.nazwisko,
             (r.data_rezerwacji + COALESCE(r.czas_suma, '0 minutes'::interval)) as data_konca
             FROM ${SCHEMA}.rezerwacje r
             JOIN ${SCHEMA}.dane_klienta k ON r.id_klienta = k.id_klienta
             WHERE r.data_rezerwacji::date = $1
             ORDER BY r.data_rezerwacji ASC`,
            [date]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reservations/:id/add-item', async (req, res) => {
    const { id } = req.params;
    const { type, itemName } = req.body;
    const table = type === 'parts' ? 'czesci' : 'usluga';
    const idField = type === 'parts' ? 'id_czesci' : 'id_uslugi';
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const itemRes = await client.query(
            `SELECT * FROM ${SCHEMA}.${table} WHERE nazwa = $1`,
            [itemName]
        );

        if (itemRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Nie znaleziono elementu w bazie." });
        }

        const item = itemRes.rows[0];
        const itemId = item.id_czesci || item.id_uslugi;
        const updateTotalsQuery = `
            UPDATE ${SCHEMA}.rezerwacje
            SET cena_suma = COALESCE(cena_suma, 0) + $1,
                czas_suma = CASE
                    WHEN $2 = 'services' THEN COALESCE(czas_suma, '0 hours'::interval) + $3::interval
                    ELSE czas_suma
                END
            WHERE id_rez = $4`;

        await client.query(updateTotalsQuery, [
            item.cena,
            type,
            (type === 'services' ? item.czas : '0 minutes'),
            id
        ]);

        const insertElementQuery = `
            INSERT INTO ${SCHEMA}.elementy_rez (id_rez, ${idField})
            VALUES ($1, $2)`;
        await client.query(insertElementQuery, [id, itemId]);

        await client.query('COMMIT');
        res.json({ success: true, message: "Dodano element i zaktualizowano koszty." });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Transaction Error:", err);
        res.status(500).json({ error: "Błąd bazy danych: " + err.message });
    } finally {
        client.release();
    }
});

app.get('/api/reservations/:id/items', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 'part' as type, c.nazwa, c.cena, NULL as czas
            FROM ${SCHEMA}.elementy_rez e
            JOIN ${SCHEMA}.czesci c ON e.id_czesci = c.id_czesci
            WHERE e.id_rez = $1
            UNION ALL
            SELECT 'service' as type, u.nazwa, u.cena, u.czas
            FROM ${SCHEMA}.elementy_rez e
            JOIN ${SCHEMA}.usluga u ON e.id_uslugi = u.id_uslugi
            WHERE e.id_rez = $1
        `;
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/reservations/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        await pool.query(
            `UPDATE ${SCHEMA}.rezerwacje SET status = $1 WHERE id_rez = $2`,
            [status, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Status Update Error:", err);
        res.status(500).json({ error: "Błąd bazy danych przy zmianie statusu." });
    }
});

app.get('/api/reservations/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM ${SCHEMA}.rezerwacje WHERE id_rez = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).send("Not found");
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/reservations/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`DELETE FROM ${SCHEMA}.elementy_rez WHERE id_rez = $1`, [id]);
        const result = await pool.query(`DELETE FROM ${SCHEMA}.rezerwacje WHERE id_rez = $1`, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Nie znaleziono zlecenia." });
        }
        res.json({ message: "Zlecenie usunięte pomyślnie." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.listen(PORT, () => console.log(`Serwer REST działa na http://localhost:${PORT}`));