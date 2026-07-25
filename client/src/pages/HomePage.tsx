import HealthStatus from '../components/HealthStatus';

export default function HomePage() {
  return (
    <section>
      <h1>DevFlow</h1>
      <p>Issue and sprint management for small software teams.</p>
      <p className="notice">Phase 1 scaffolding is complete.</p>
      <HealthStatus />
    </section>
  );
}
