import jwt from 'jsonwebtoken';

export default function auth(req, res, next){
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  }catch(err){
    return res.status(401).json({ error: 'Invalid token' });
  }
}
