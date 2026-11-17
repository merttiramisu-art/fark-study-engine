/** Pure keyboard navigation for an ARIA tablist. */
export function nextTabIndex(key, currentIndex, count) {
  if (!Number.isInteger(currentIndex) || !Number.isInteger(count) || count < 1 || currentIndex < 0 || currentIndex >= count) {
    throw new RangeError('invalid tab position');
  }
  switch (key) {
    case 'ArrowRight': return (currentIndex + 1) % count;
    case 'ArrowLeft': return (currentIndex - 1 + count) % count;
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return null;
  }
}
