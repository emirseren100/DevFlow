import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../lib/apiClient';

export default function RegisterPage() {
  const { register, error } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      await register({ name, email, password });
      navigate('/app', { replace: true });
    } catch (caught) {
      // Per-field messages come from the server's Zod validation.
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function fieldError(field: string) {
    const messages = fieldErrors[field];

    return messages?.length ? <span role="alert">{messages[0]}</span> : null;
  }

  return (
    <section>
      <h1>Register</h1>

      <form onSubmit={handleSubmit} noValidate>
        <p>
          <label htmlFor="register-name">Name</label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          {fieldError('name')}
        </p>

        <p>
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {fieldError('email')}
        </p>

        <p>
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {fieldError('password')}
        </p>

        {error && Object.keys(fieldErrors).length === 0 ? <p role="alert">{error}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p>
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}
