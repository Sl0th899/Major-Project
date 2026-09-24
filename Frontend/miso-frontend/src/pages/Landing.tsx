import { Link } from "react-router-dom";
import Miso, { type MisoMood } from "../components/miso/Miso";
import { ButtonLink } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useAuth } from "../state/AuthContext";

const STEPS: { title: string; text: string; mood: MisoMood }[] = [
  { title: "Make yourself a space", text: "Sign up with an email and password. Your conversations are tied to your account.", mood: "neutral" },
  { title: "Say what's on your mind", text: "Type as much or as little as you like. A long ramble and a single word both count.", mood: "listening" },
  { title: "Talk it through", text: "Miso replies warmly, reflects back what it hears, and suggests small, gentle next steps.", mood: "happy" },
  { title: "Come back whenever", text: "Your conversations are saved, so you can pick one up again or start fresh.", mood: "sleepy" },
];

const FEATURES = [
  { title: "Follows the thread", text: "Miso keeps the recent part of your conversation in mind, so you don't have to repeat yourself." },
  { title: "Saved conversations", text: "Every conversation is kept under your account, newest first, ready to reopen." },
  { title: "Delete anytime", text: "Remove any conversation and every message in it, permanently, in two clicks." },
  { title: "Honest about what it is", text: "Miso won't diagnose or prescribe, and points you to real help when things are serious." },
];

export default function Landing() {
  useDocumentTitle();
  const { status } = useAuth();
  const authed = status === "authenticated";
  const primary = authed ? { to: "/chat", label: "Open your conversations" } : { to: "/register", label: "Start talking" };

  return (
    <div className="landing">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="nav">
        <Logo />
        <nav className="nav__links" aria-label="Main">
          <a href="#how">How it works</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <div className="nav__actions">
          {!authed && <Link to="/login" className="nav__signin">Sign in</Link>}
          <ButtonLink to={primary.to} size="sm">{authed ? "Open chats" : "Start talking"}</ButtonLink>
        </div>
      </header>

      <main id="main">
        <section className="hero">
          <div className="hero__copy">
            <h1 className="hero__title">Talk it through with a cat who listens.</h1>
            <p className="hero__lead">
              Miso is a gentle AI companion for the thoughts that feel too heavy, too tangled, or too small to say out loud.
              Write whatever's on your mind. Miso listens, reflects, and helps you find a next small step.
            </p>
            <div className="hero__ctas">
              <ButtonLink to={primary.to} size="lg">{primary.label}</ButtonLink>
              {!authed && <ButtonLink to="/login" size="lg" variant="ghost">I have an account</ButtonLink>}
            </div>
            <p className="hero__note">Miso is a supportive companion, not a licensed therapist.</p>
          </div>
          <div className="hero__art">
            <div className="window">
              <div className="window__sky" />
              <div className="window__cat"><Miso size={300} decorative /></div>
              <div className="window__sill" />
            </div>
            <p className="hero__bubble" aria-hidden="true">Hi, I'm Miso. What's on your mind?</p>
          </div>
        </section>

        <section className="section" id="how" aria-labelledby="how-title">
          <h2 id="how-title" className="section__title">How it works</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <Miso mood={s.mood} variant="head" size={64} animated={false} decorative />
                <span className="step__num" aria-hidden="true">{i + 1}</span>
                <h3 className="step__title">{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="section section--tinted" aria-labelledby="features-title">
          <h2 id="features-title" className="section__title">What Miso can do</h2>
          <ul className="features">
            {FEATURES.map((f) => (
              <li key={f.title} className="feature">
                <h3 className="feature__title">{f.title}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="section privacy" id="privacy" aria-labelledby="privacy-title">
          <div className="privacy__cat" aria-hidden="true"><Miso mood="contempt" size={200} decorative /></div>
          <div className="privacy__copy">
            <h2 id="privacy-title" className="section__title">What happens to your words</h2>
            <p>
              We'd rather tell you plainly than promise too much. Your conversations are stored in this app's database under your account,
              and only your signed-in account can open them. To write a reply, Miso sends the recent part of your conversation to an
              AI language model provider.
            </p>
            <p>
              Your password is stored as a salted hash, never as plain text. Sign-ins expire on their own, and signing out ends your
              session on the server. You can delete any conversation, along with every message in it, whenever you like.
            </p>
            <p className="privacy__care">
              Miso isn't a doctor or a crisis service. If you might be in danger, or you're thinking about harming yourself,
              please contact your local emergency services or someone you trust right now.
            </p>
          </div>
        </section>

        <section className="final-cta">
          <Miso mood="sparkle" size={150} decorative />
          <h2 className="final-cta__title">There's a spot on the windowsill with your name on it.</h2>
          <ButtonLink to={primary.to} size="lg">{primary.label}</ButtonLink>
        </section>
      </main>

      <footer className="footer">
        <Logo />
        <p>Miso is an AI companion for everyday worries. It is not a medical or emergency service.</p>
      </footer>
    </div>
  );
}
