const { findUserById, getAllUsers } = require('../models/userModel');

async function main() {
  const users = await getAllUsers();
  console.log('All DB Users:', users);
}

main().catch(console.error);
