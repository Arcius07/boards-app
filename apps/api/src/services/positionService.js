function getNewPosition(prevPosition, nextPosition) {
  if (prevPosition == null && nextPosition == null) {
    return 1;
  }
  if (prevPosition == null) {
    return nextPosition / 2;
  }
  if (nextPosition == null) {
    return prevPosition + 1;
  }
  return (prevPosition + nextPosition) / 2;
}

module.exports = { getNewPosition };