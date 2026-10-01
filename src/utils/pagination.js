export const buildPagination = ({ total, page, limit }) => {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  return {
    total,
    page,
    limit,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  };
};
