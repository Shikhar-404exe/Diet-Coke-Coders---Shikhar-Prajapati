/** Scroll a child into its overflow parent without yanking the window. */
export function scrollChildIntoParent(endRef, parentRef, force = false) {
  const end = endRef?.current;
  const parent = parentRef?.current;
  if (!end || !parent) return;
  const distanceFromBottom = parent.scrollHeight - parent.scrollTop - parent.clientHeight;
  if (!force && distanceFromBottom > 120) return;
  parent.scrollTop = parent.scrollHeight;
}
