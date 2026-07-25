import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>
        This route does not exist. Go back to the <Link to="/">home page</Link>.
      </p>
    </section>
  );
}
