import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

function StepBadge({ number }: { number: number }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
      {number}
    </span>
  );
}

export default function Guide() {
  return (
    <div className="dark scroll-smooth min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
          <h1 className="text-3xl font-bold text-primary">Overtone Singer Guide</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            A quick-start guide for sound healing students and practitioners.
          </p>
        </div>

        {/* Getting Started */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-primary mb-4">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <StepBadge number={1} />
              <div>
                <h3 className="font-semibold text-foreground">Open the App</h3>
                <p className="text-base text-muted-foreground">
                  Go to <span className="text-primary font-medium">overtonesinger.com</span> on your phone, tablet, or laptop. Chrome works best. No download needed.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <StepBadge number={2} />
              <div>
                <h3 className="font-semibold text-foreground">Allow Microphone</h3>
                <p className="text-base text-muted-foreground">
                  Your browser will ask to use your microphone. Tap <span className="text-foreground font-medium">"Allow"</span>. If you accidentally blocked it, tap the lock icon in the address bar to re-enable.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <StepBadge number={3} />
              <div>
                <h3 className="font-semibold text-foreground">Sing or Hum</h3>
                <p className="text-base text-muted-foreground">
                  You'll see coloured lines appear on the spectrogram in real time as your voice is picked up.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Reading the Display */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-primary mb-4">Reading the Display</h2>
          <ul className="space-y-3 text-base text-muted-foreground">
            <li className="flex gap-2 items-start">
              <span className="text-primary font-bold mt-0.5">&#8594;</span>
              <span><span className="text-foreground font-medium">Time</span> runs left to right &mdash; newest sound appears on the right</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-primary font-bold mt-0.5">&#8593;</span>
              <span><span className="text-foreground font-medium">Frequency (Hz)</span> runs bottom to top &mdash; low notes at the bottom, high notes at the top</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-amber-400 font-bold mt-0.5">&#9679;</span>
              <span><span className="text-foreground font-medium">Colour &amp; brightness</span> shows volume &mdash; brighter means louder</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-primary font-bold mt-0.5">&#9473;</span>
              <span><span className="text-foreground font-medium">The lowest bright line</span> is your fundamental note (the pitch you're singing)</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-primary font-bold mt-0.5">&#9559;</span>
              <span><span className="text-foreground font-medium">The lines above it</span> are your overtones/harmonics &mdash; these are what overtone singers learn to isolate and amplify</span>
            </li>
          </ul>
        </section>

        {/* Tips for Overtone Singing Practice */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-primary mb-4">Tips for Overtone Singing Practice</h2>
          <ul className="space-y-3 text-base text-muted-foreground">
            <li>
              <span className="text-amber-400 font-medium">Vowel shapes:</span>{' '}
              Slowly shift between 'EE', 'OO', 'AH' and watch how the overtone lines move and change brightness.
            </li>
            <li>
              <span className="text-amber-400 font-medium">Isolating overtones:</span>{' '}
              Hold a steady low drone note. Try to make one single upper line get brighter &mdash; that's an isolated overtone.
            </li>
            <li>
              <span className="text-amber-400 font-medium">Volume:</span>{' '}
              Sing at a steady, moderate volume. Too quiet and overtones won't show clearly.
            </li>
            <li>
              <span className="text-amber-400 font-medium">Microphone distance:</span>{' '}
              Keep 15&ndash;30 cm from your device mic for clearest results.
            </li>
            <li>
              <span className="text-amber-400 font-medium">Quiet space:</span>{' '}
              Background noise appears as scattered colour. A quiet room gives the cleanest visualisation.
            </li>
          </ul>
        </section>

        {/* Troubleshooting */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-primary mb-4">Troubleshooting</h2>
          <dl className="space-y-4 text-base">
            <div>
              <dt className="text-foreground font-medium">No sound detected?</dt>
              <dd className="text-muted-foreground">Check your browser has microphone permission enabled (look for the mic/lock icon in the address bar).</dd>
            </div>
            <div>
              <dt className="text-foreground font-medium">Display looks messy?</dt>
              <dd className="text-muted-foreground">Reduce background noise &mdash; close windows, move away from fans/AC.</dd>
            </div>
            <div>
              <dt className="text-foreground font-medium">Laggy or slow?</dt>
              <dd className="text-muted-foreground">Close other browser tabs. Chrome gives the best performance.</dd>
            </div>
            <div>
              <dt className="text-foreground font-medium">On iPhone?</dt>
              <dd className="text-muted-foreground">Safari works but Chrome is recommended for best results.</dd>
            </div>
          </dl>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-6 text-sm text-muted-foreground text-center space-y-1">
          <p className="italic">Built by a sound healer, for sound healers.</p>
          <p>Part of the NestorLab ecosystem</p>
        </footer>
      </div>

      {/* Sticky "Open App" button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="block w-full text-center py-3 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
          >
            Open App
          </Link>
        </div>
      </div>
    </div>
  );
}
