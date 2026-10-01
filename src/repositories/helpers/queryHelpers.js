/**
 * Consulta paginada genérica: devuelve la página pedida y el total de
 * documentos que cumplen el filtro (ambas consultas en paralelo).
 */
export const findPaginated = async (
  model,
  filter,
  { page, limit, projection, sort = { createdAt: -1 }, populate = [] },
) => {
  let query = model
    .find(filter, projection)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
  for (const option of populate) query = query.populate(option);

  const [docs, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);
  return { docs, total };
};

// Convierte { campo: null } en $unset y el resto en $set.
export const buildUpdate = (changes) => {
  const $set = {};
  const $unset = {};
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) $unset[key] = '';
    else if (value !== undefined) $set[key] = value;
  }
  const update = {};
  if (Object.keys($set).length > 0) update.$set = $set;
  if (Object.keys($unset).length > 0) update.$unset = $unset;
  return update;
};

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
