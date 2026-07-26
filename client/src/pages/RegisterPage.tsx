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

    return messages?.length ? (
      <span className="field__error" role="alert">
        {messages[0]}
      </span>
    ) : null;
  }

  return (
    <section className="auth">
      <div className="auth__card">
        <h1>Register</h1>
        <p className="auth__lead">
          Create an account, then start a workspace or accept an invitation to one.
        </p>

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
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
          </div>

          <div className="field">
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
          </div>

          <div className="field">
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
            <span className="field__hint">At least 8 characters.</span>
            {fieldError('password')}
          </div>

          {error && Object.keys(fieldErrors).length === 0 ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>

      <p className="auth__footer">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}
