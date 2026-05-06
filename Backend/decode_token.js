const base64Url = process.env.SUPABASE_KEY.split('.')[1];
const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
console.log(Buffer.from(base64, 'base64').toString());
