const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Bhavyuktha1511@04',
  database: 'myDiary'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err);
    return;
  }
  console.log('✅ Connected to the MySQL database!');
});

// Serve login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Register
app.post('/registerUser', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    connection.query(
      'INSERT INTO Users (EmailID, HashedPassword) VALUES (?, ?)',
      [email, hashedPassword],
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'User already exists' });
          console.error('❌ Registration error:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        console.log('✅ Registered user:', email);
        return res.status(200).json({ message: 'Registered successfully' });
      }
    );
  } catch (err) {
    console.error('❌ Hashing error:', err);
    return res.status(500).json({ message: 'Hashing failed' });
  }
});

// Login
app.post('/userLogin', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Email and password required');

  connection.query(
    'SELECT ID, HashedPassword FROM Users WHERE EmailID = ?',
    [email],
    async (err, results) => {
      if (err) return res.status(500).send('Internal server error');
      if (results.length === 0) return res.status(401).send('User not found');

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.HashedPassword);

      if (!isMatch) return res.status(401).send('Invalid password');
      console.log('✅ User logged in:', email);
      return res.status(200).json({ userID: email });
    }
  );
});

// New post
app.post('/newPost', (req, res) => {
  const { postTitle, postDescription, userID } = req.body;
  if (!userID || !postTitle || !postDescription)
    return res.status(400).json({ message: 'All fields required' });

  connection.query('SELECT ID FROM Users WHERE EmailID = ?', [userID], (err, results) => {
    if (err || results.length === 0) return res.status(403).json({ message: 'User not found' });

    const userNumericID = results[0].ID;
    connection.query(
      'INSERT INTO Posts (UserID, postTitle, postDescription) VALUES (?, ?, ?)',
      [userNumericID, postTitle, postDescription],
      (err) => {
        if (err) return res.status(500).json({ message: 'Post creation failed' });
        console.log(`📝 New post by ${userID}: ${postTitle}`);
        return res.status(200).json({ message: 'Post created successfully' });
      }
    );
  });
});

// Get posts
app.get('/getMyPosts', (req, res) => {
  const { userID } = req.query;
  if (!userID) return res.status(400).json({ message: 'userID required' });

  connection.query('SELECT ID FROM Users WHERE EmailID = ?', [userID], (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    const userNumericID = results[0].ID;
    connection.query(
      'SELECT ID, postTitle, postDescription, created_at FROM Posts WHERE UserID = ? ORDER BY created_at DESC',
      [userNumericID],
      (err, posts) => {
        if (err) return res.status(500).json({ message: 'Failed to load posts' });
        return res.status(200).json(posts);
      }
    );
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
