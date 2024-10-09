const bcrypt = require('bcrypt');

async function hashPassword() {
  const password = 'csk2024';
  const hashedPassword = await bcrypt.hash(password, 10); // Wait for the Promise to resolve
  console.log(hashedPassword);
}

hashPassword();