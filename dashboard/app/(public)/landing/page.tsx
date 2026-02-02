import Link from 'next/link';
import { Database, HardDrive, Code2, Key, Shield, Zap, ArrowRight, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Database,
    title: 'Database per Project',
    description: 'Each project gets its own isolated PostgreSQL database with full SQL access and a built-in query editor.',
  },
  {
    icon: HardDrive,
    title: 'File Storage',
    description: 'S3-compatible storage powered by MinIO. Organize files in buckets with presigned URL uploads.',
  },
  {
    icon: Code2,
    title: 'REST API',
    description: 'Public CRUD API with Supabase-like query syntax. Select, insert, update, and delete with filters.',
  },
  {
    icon: Key,
    title: 'API Key Management',
    description: 'Publishable and secret keys per project. Rotate and revoke keys with full audit trails.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description: 'Built-in auth with JWT sessions and invite-only registration. API keys with SHA-256 hashing.',
  },
  {
    icon: Zap,
    title: 'Self-Hosted',
    description: 'Run on your own infrastructure. Docker Compose deployment for both development and production.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Database className="h-5 w-5 text-emerald-500" />
            </div>
            <span className="text-xl font-bold text-zinc-100">AtlasHub</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/?demo=true"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Try Demo
            </Link>
            <Button asChild size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-sm text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Self-hosted backend platform
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl lg:text-6xl">
            Your own{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Supabase-like
            </span>{' '}
            backend
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400">
            AtlasHub gives you PostgreSQL databases, file storage, and REST APIs for your
            applications. Self-hosted, open source, and runs on a Raspberry Pi.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/?demo=true">
                Explore Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <a
                href="https://github.com/marczelloo/atlashub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100">
              Everything you need
            </h2>
            <p className="mx-auto max-w-2xl text-zinc-400">
              A complete backend platform with all the features you need to build and deploy
              your applications.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-zinc-700"
              >
                <div className="mb-4 inline-flex rounded-lg bg-emerald-500/10 p-3">
                  <feature.icon className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">{feature.title}</h3>
                <p className="text-sm text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t border-zinc-800 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100">
              Built with modern tech
            </h2>
            <p className="mx-auto max-w-2xl text-zinc-400">
              Powered by battle-tested technologies for reliability and performance.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">Node.js</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">Fastify</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">PostgreSQL</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">MinIO</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">Next.js</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">Docker</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100">
            Ready to get started?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-zinc-400">
            Try the interactive demo to explore the dashboard, or check out the documentation
            to deploy AtlasHub on your own infrastructure.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/?demo=true">Try the Demo</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            <span className="font-medium text-zinc-100">AtlasHub</span>
          </div>
          <p className="text-sm text-zinc-500">
            Built by{' '}
            <a
              href="https://marczelloo.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 transition-colors hover:text-emerald-400"
            >
              marczelloo
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
