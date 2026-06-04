const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateTokens = (userId) => {
  const access = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refresh = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { access, refresh };
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email }).populate('companyId', 'name status logo');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.status === 'inactive') return res.status(401).json({ message: 'Account inactive' });
    if (user.companyId && user.companyId.status === 'inactive') {
      return res.status(401).json({ message: 'Company account is inactive' });
    }

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const { access, refresh } = generateTokens(user._id);
    res.json({
      accessToken: access,
      refreshToken: refresh,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        designation: user.designation,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || user.status === 'inactive') return res.status(401).json({ message: 'Invalid user' });
    const { access, refresh } = generateTokens(user._id);
    res.json({ accessToken: access, refreshToken: refresh });
  } catch (err) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

exports.me = async (req, res) => {
  res.json(req.user);
};
