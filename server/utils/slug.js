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

export const ensureUniqueVetSlug = async (pool, base) => {
    let slug = base || 'vet';
    let n = 1;
    while (true) {
        const candidate = n === 1 ? slug : `${slug}-${n}`;
        const { rows } = await pool.query('SELECT 1 FROM vets WHERE slug = $1', [candidate]);
        if (rows.length === 0) return candidate;
        n += 1;
        if (n > 999) throw new Error('cannot find unique slug');
    }
};
