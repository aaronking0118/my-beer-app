import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Define the shape of a Beer object for strict type safety
interface Beer {
    id?: number;
    beer_number?: number;
    brewery_name?: string;
    beer_name?: string;
    beer_style?: string;
    abv?: number | null;
    ibu?: number | null;
    srm?: number | null;
    rank?: number | null;
    tasting_notes?: string | null;
    country?: string | null;
    state?: string | null;
    consumption_date?: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        return res.status(500).json({ error: 'DATABASE_URL environment variable is not defined.' });
    }

    const sql = neon(databaseUrl);

    try {
        // Handle PUT request to update an existing beer
        if (req.method === 'PUT') {
            const {
                id,
                beer_number,
                beer_style,
                abv,
                ibu,
                rank,
                tasting_notes,
                country,
                state
            } = req.body as Beer;

            if (!id && !beer_number) {
                return res.status(400).json({ error: 'Beer ID or beer_number is required for updates.' });
            }

            const parsedAbv = abv !== '' && abv != null ? parseFloat(String(abv)) : null;
            const parsedIbu = ibu !== '' && ibu != null ? parseInt(String(ibu), 10) : null;
            const parsedRank = rank !== '' && rank != null ? parseFloat(String(rank)) : null;

            const updateResult = await sql`
                UPDATE beers 
                SET 
                    beer_style = COALESCE(${beer_style || null}, beer_style),
                    abv = COALESCE(${parsedAbv}, abv),
                    ibu = COALESCE(${parsedIbu}, ibu),
                    rank = COALESCE(${parsedRank}, rank),
                    tasting_notes = COALESCE(${tasting_notes || null}, tasting_notes),
                    country = COALESCE(${country || null}, country),
                    state = COALESCE(${state || null}, state)
                WHERE id = ${id || null} OR beer_number = ${beer_number || null}
                RETURNING *;
            `;

            if (updateResult.length === 0) {
                return res.status(404).json({ error: 'Beer not found.' });
            }

            res.setHeader('Content-Type', 'application/json');
            return res.status(200).json({
                message: 'Beer successfully updated in database!',
                beer: updateResult[0]
            });
        }

        // Handle POST request to insert a new beer
        if (req.method === 'POST') {
            let {
                beer_number,
                brewery_name,
                beer_name,
                country,
                state,
                rank,
                tasting_notes,
                consumption_date
            } = req.body as Beer;

            if (!brewery_name || !beer_name) {
                return res.status(400).json({ error: 'Brewery name and beer name are required.' });
            }

            // Get next sequential beer_number if not provided
            if (!beer_number) {
                const maxResult = await sql`SELECT MAX(beer_number) as max_num FROM beers`;
                beer_number = (Number(maxResult[0]?.max_num) || 10000) + 1;
            }

            const finalConsumptionDate = consumption_date || new Date().toISOString().split('T')[0];
            const parsedRank = rank !== '' && rank != null ? parseFloat(String(rank)) : null;

            const insertResult = await sql`
                INSERT INTO beers (
                    beer_number,
                    brewery_name,
                    beer_name,
                    country,
                    state,
                    rank,
                    tasting_notes,
                    consumption_date
                ) VALUES (
                    ${beer_number},
                    ${brewery_name},
                    ${beer_name},
                    ${country || null},
                    ${state || null},
                    ${parsedRank},
                    ${tasting_notes || null},
                    ${finalConsumptionDate}
                )
                RETURNING id, beer_number, brewery_name, beer_name, rank, consumption_date;
            `;

            res.setHeader('Content-Type', 'application/json');
            return res.status(201).json({
                message: 'Beer successfully logged to database!',
                beer: insertResult[0]
            });
        }

        // Handle request for unique breweries list
        if (req.query.action === 'breweries') {
            const breweries = await sql`
                SELECT DISTINCT brewery_name, country, state 
                FROM beers 
                WHERE brewery_name IS NOT NULL 
                ORDER BY brewery_name ASC
            `;
            res.setHeader('Content-Type', 'application/json');
            return res.status(200).json({ breweries });
        }

        // GET request handler parameters
        const page = parseInt(String(req.query.page), 10) || 1;
        const limit = parseInt(String(req.query.limit), 10) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search ? `%${String(req.query.search)}%` : '%%';
        const style = String(req.query.style || '');
        const sort = String(req.query.sort || 'brewery_asc');

        let orderBy = sql`ORDER BY brewery_name ASC, beer_name ASC`;
        if (sort === 'oldest') orderBy = sql`ORDER BY id ASC`;
        if (sort === 'newest') orderBy = sql`ORDER BY id DESC`;
        if (sort === 'rank_desc') orderBy = sql`ORDER BY rank DESC NULLS LAST`;
        if (sort === 'abv_desc') orderBy = sql`ORDER BY abv DESC NULLS LAST`;

        let beersQuery, countQuery;
        if (style) {
            beersQuery = sql`
                SELECT id, beer_number, beer_name, brewery_name, beer_style, rank, abv, ibu, srm, country, state, tasting_notes, consumption_date
                FROM beers 
                WHERE (beer_name ILIKE ${search} OR brewery_name ILIKE ${search})
                AND beer_style = ${style}
                ${orderBy}
                LIMIT ${limit} OFFSET ${offset}
            `;
            countQuery = sql`
                SELECT COUNT(*) as total 
                FROM beers 
                WHERE (beer_name ILIKE ${search} OR brewery_name ILIKE ${search})
                AND beer_style = ${style}
            `;
        } else {
            beersQuery = sql`
                SELECT id, beer_number, beer_name, brewery_name, beer_style, rank, abv, ibu, srm, country, state, tasting_notes, consumption_date 
                FROM beers 
                WHERE (beer_name ILIKE ${search} OR brewery_name ILIKE ${search})
                ${orderBy}
                LIMIT ${limit} OFFSET ${offset}
            `;
            countQuery = sql`
                SELECT COUNT(*) as total 
                FROM beers 
                WHERE (beer_name ILIKE ${search} OR brewery_name ILIKE ${search})
            `;
        }

        const [beers, countResult, stylesResult, breweryCountResult] = await Promise.all([
            beersQuery,
            countQuery,
            sql`SELECT DISTINCT beer_style FROM beers WHERE beer_style IS NOT NULL ORDER BY beer_style ASC`,
            sql`SELECT COUNT(DISTINCT brewery_name) as total_breweries FROM beers WHERE brewery_name IS NOT NULL`
        ]);

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
            beers,
            total: parseInt(countResult[0].total, 10),
            totalBreweries: parseInt(breweryCountResult[0].total_breweries, 10),
            page,
            limit,
            styles: stylesResult.map((s: any) => s.beer_style)
        });

    } catch (error: any) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
    }
}