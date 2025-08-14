import request from 'supertest';
import { app, server } from '../server';
import { User } from '../models/User';
import path from 'path';

afterAll(() => {
  server.close();
});

describe('User API Endpoints', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.name).toBe('Test User');
  });

  it('should allow a registered user to login', async () => {
    // First, create the user
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Login User',
        email: 'login@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

    // Then, attempt to login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('access_token');
    expect(res.body.data.email).toBe('login@example.com');
  });

  it('should allow a user to upload a profile picture', async () => {
    // 1. Register and login to get a token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Image User', email: 'image@example.com', password: 'password123', confirmPassword: 'password123' });
    const token = registerRes.body.token;

    // 2. Make the authenticated file upload request
    // We are not actually checking the file content here, just that the endpoint works.
    // Supertest's .attach() method simulates file uploads.
    const res = await request(app)
      .post('/api/auth/profile-image')
      .set('Authorization', `Bearer ${token}`)
      .attach('profileImage', path.resolve(__dirname, 'test-image.jpg')); // You'll need a dummy image file in your test directory

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Profile image updated successfully.');
    expect(res.body.data.profileImageUrl).toBeDefined();

    // Verify the user in the database was updated
    const user = await User.findOne({ email: 'image@example.com' });
    expect(user?.profileImageUrl).toContain('https://your-cloud-storage.com');
  });
});
