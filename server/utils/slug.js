// Slugify reutilizable: normaliza acentos, minúsculas, alfanumérico + guiones.
// Si el slug ya existe en la tabla `vets`, agrega -2, -3, ... hasta encontrar
// uno libre. Uso desde authController (register vet) y vetController (create/update).

export const slugify = (raw) => {
    return String(raw)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
};

// Tablas con columna `slug` sobre las que sabemos buscar. Allowlist explícita:
// el nombre de tabla se interpola en el SQL (no se puede parametrizar), así que
// NUNCA debe venir de input del usuario.
const SLUGGABLE = { vets: 'vet', shelters: 'refugio' };

// Devuelve un slug libre en `table`, agregando -2, -3, ... si hace falta.
export const ensureUniqueSlug = async (pool, table, base) => {
    const fallback = SLUGGABLE[table];
    if (!fallback) throw new Error(`tabla no habilitada para slugs: ${table}`);

    const slug = base || fallback;
    let n = 1;
    while (true) {
        const candidate = n === 1 ? slug : `${slug}-${n}`;
        const { rows } = await pool.query(`SELECT 1 FROM ${table} WHERE slug = $1`, [candidate]);
        if (rows.length === 0) return candidate;
        n += 1;
        if (n > 999) throw new Error('cannot find unique slug');
    }
};

// Alias histórico (lo usan authController y vetController).
export const ensureUniqueVetSlug = (pool, base) => ensureUniqueSlug(pool, 'vets', base);
