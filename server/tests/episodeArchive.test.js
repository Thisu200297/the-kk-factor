const { clampToArchive, ARCHIVE_DEFAULTS } = require('../controllers/episodeController');

/**
 * Showing only part of the archive.
 *
 * She holds fifteen episodes and wants three on the page. The trap is that a
 * cap applied to the page size alone leaves the pager advertising pages that
 * do not exist — the reader clicks "next" and gets an empty list. So the
 * total shrinks first, and the page is cut to what remains of it.
 */
describe('clampToArchive', () => {
  const page = (n, limit = 12) => ({ offset: (n - 1) * limit, limit });

  it('shows three of fifteen', () => {
    expect(clampToArchive({ total: 15, cap: 3, ...page(1) })).toEqual({ visible: 3, take: 3 });
  });

  it('reports the capped total, so the pager offers no second page', () => {
    const { visible } = clampToArchive({ total: 15, cap: 3, ...page(1) });
    expect(Math.ceil(visible / 12)).toBe(1);
  });

  it('gives nothing for a page past the cap', () => {
    expect(clampToArchive({ total: 15, cap: 3, ...page(2) })).toEqual({ visible: 3, take: 0 });
  });

  it('cuts a page that straddles the cap', () => {
    // cap 5, pages of 4: page two may only have one.
    expect(clampToArchive({ total: 15, cap: 5, ...page(2, 4) })).toEqual({ visible: 5, take: 1 });
  });

  it('does not invent episodes when the cap exceeds what exists', () => {
    expect(clampToArchive({ total: 2, cap: 10, ...page(1) })).toEqual({ visible: 2, take: 2 });
  });

  it('treats zero as no cap at all', () => {
    expect(clampToArchive({ total: 40, cap: 0, ...page(1) })).toEqual({ visible: 40, take: 12 });
  });

  it('pages normally when uncapped', () => {
    expect(clampToArchive({ total: 40, cap: 0, ...page(4) })).toEqual({ visible: 40, take: 4 });
  });

  it('handles an empty archive', () => {
    expect(clampToArchive({ total: 0, cap: 3, ...page(1) })).toEqual({ visible: 0, take: 0 });
  });

  it('never asks the database for a negative number of rows', () => {
    const { take } = clampToArchive({ total: 15, cap: 3, ...page(9) });
    expect(take).toBe(0);
    expect(take).toBeGreaterThanOrEqual(0);
  });

  it('defaults to the three she asked for', () => {
    expect(ARCHIVE_DEFAULTS.limit).toBe(3);
  });
});
