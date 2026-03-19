function resolveConflict(local, remote) {
  // Strategy: Higher version wins
  // If equal → latest updated_at wins
  // Never overwrite unsynced local changes (sync_status === 'pending')

  if (local.sync_status === 'pending') {
    return 'local';
  }

  if (remote.version > local.version) {
    return 'remote';
  }

  if (remote.version === local.version) {
    const remoteDate = new Date(remote.updated_at);
    const localDate = new Date(local.updated_at);
    if (remoteDate > localDate) {
      return 'remote';
    }
  }

  return 'local';
}

module.exports = { resolveConflict };
