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
          <h1 className="text-3xl font-bold text-primary">Overtone Singer &mdash; User Guide</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            How to use the real-time vocal frequency analyser
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
                  Go to <span className="text-primary font-medium">overtonesinger.com</span> on your phone, tablet, or laptop. Chrome gives the best performance. No download or account needed.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <StepBadge number={2} />
              <div>
                <h3 className="font-semibold text-foreground">Allow Microphone Access</h3>
                <p className="text-base text-muted-foreground">
                  Your browser will ask permission to use your microphone. Tap <span className="text-foreground font-medium">"Allow"</span> when the pop-up appears. If you accidentally blocked it, tap the lock or microphone icon in the address bar to re-enable it.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <StepBadge number={3} />
              <div>
                <h3 className="font-semibold text-foreground">Start Using</h3>
                <p className="text-base text-muted-foreground">
                  Sing, hum, or play an instrument near your device microphone. You will see the frequencies appear as coloured lines on the spectrogram display in real time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Understanding the Display */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-primary mb-4">Understanding the Display</h2>
          <h3 className="font-semibold text-foreground mb-3">The Spectrogram Window</h3>
          <ul className="space-y-3 text-base text-muted-foreground">
            <li className="flex gap-2 items-start">
              <span className="text-primary font-bold mt-0.5">&rarr;</span>
              <span>The display scrolls from left to right &mdash; newest sound appears on the right</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-primary font-bold mt-0.5">&uarr;</span>
              <span>The vertical axis shows frequency (Hz) &mdash; low frequencies at the bottom, high at the top</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-amber-400 font-bold mt-0.5">&#9679;</span>
              <span>Colour and brightness show volume &mdash; brighter and warmer colours mean louder</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-primary font-bold mt-0.5">&#9473;</span>
              <span>The lowest bright horizontal line is your fundamental frequency (the note being sung or played)</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-primary font-bold mt-0.5">&#9559;</span>
              <span>Any lines appearing above the fundamental are the overtones/harmonics present in the sound</span>
            </li>
          </ul>
        </section>

        {/* App Controls */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-primary mb-4">App Controls</h2>

          <h3 className="font-semibold text-foreground mb-3">Transport Bar (top row)</h3>
          <p className="text-base text-muted-foreground mb-3">The round buttons along the top of the screen control recording and playback.</p>
          <ul className="space-y-2 text-base text-muted-foreground mb-6">
            <li><span className="text-foreground font-medium">Record (circle icon)</span> &mdash; Starts capturing audio from your microphone. The spectrogram begins drawing in real time.</li>
            <li><span className="text-foreground font-medium">Play (triangle icon)</span> &mdash; Plays back a stopped recording so you can review what was captured.</li>
            <li><span className="text-foreground font-medium">Loop (repeat icon)</span> &mdash; Toggles looped playback so the recording repeats continuously.</li>
            <li><span className="text-foreground font-medium">Stop (square icon)</span> &mdash; Stops the current recording or playback.</li>
            <li><span className="text-foreground font-medium">New Session (reset icon)</span> &mdash; Clears the current recording and resets the display so you can start fresh.</li>
            <li><span className="text-foreground font-medium">Export WAV (download icon)</span> &mdash; Saves the recorded audio as a WAV file to your device.</li>
            <li><span className="text-foreground font-medium">Export PNG (image icon)</span> &mdash; Saves a screenshot of the current spectrogram display as a PNG image.</li>
            <li><span className="text-foreground font-medium">Export Video (video icon)</span> &mdash; Creates a video of the spectrogram playback and saves it to your device.</li>
          </ul>

          <h3 className="font-semibold text-foreground mb-3">Top-right buttons</h3>
          <ul className="space-y-2 text-base text-muted-foreground mb-6">
            <li><span className="text-foreground font-medium">? (help icon)</span> &mdash; Opens this user guide.</li>
            <li><span className="text-foreground font-medium">Pro (star/tick icon)</span> &mdash; Shows your Pro status or opens the upgrade screen.</li>
            <li><span className="text-foreground font-medium">Fullscreen (expand icon)</span> &mdash; Expands the app to fill your entire screen. Tap again to exit.</li>
          </ul>

          <h3 className="font-semibold text-foreground mb-3">Display Settings (second row)</h3>
          <p className="text-base text-muted-foreground mb-3">The sliders and buttons below the transport bar adjust how the spectrogram looks.</p>
          <ul className="space-y-2 text-base text-muted-foreground mb-6">
            <li><span className="text-foreground font-medium">Brightness (sun icon)</span> &mdash; Adjusts the overall brightness of the spectrogram colours. Increase to make quieter frequencies more visible.</li>
            <li><span className="text-foreground font-medium">Declutter (contrast icon)</span> &mdash; Reduces visual noise by fading out faint background frequencies, leaving only the clearer lines.</li>
            <li><span className="text-foreground font-medium">Sharpness (focus icon)</span> &mdash; Controls how sharp or smooth the frequency lines appear on the display.</li>
            <li><span className="text-foreground font-medium">Colour Scheme (palette icon)</span> &mdash; Cycles through different colour themes for the spectrogram: Default, Warm, Cool, and Monochrome.</li>
            <li><span className="text-foreground font-medium">Intensity Scale (wave icon)</span> &mdash; Changes how volume is mapped to colour. Cycles between Linear, Logarithmic, and Power modes.</li>
            <li><span className="text-foreground font-medium">Harmonic Target (target icon)</span> &mdash; Highlights a specific harmonic (H2 through H8) on the display to help you focus on one overtone at a time. Tap repeatedly to cycle through harmonics or turn it off.</li>
          </ul>

          <h3 className="font-semibold text-foreground mb-3">Frequency Band Filter (on the spectrogram)</h3>
          <p className="text-base text-muted-foreground mb-6">
            Two draggable handles appear on the right side of the spectrogram &mdash; a <span className="text-[#00c8ff] font-medium">cyan handle</span> at the top and an <span className="text-[#ffb400] font-medium">amber handle</span> at the bottom. Drag these up or down to narrow the visible and audible frequency range. This is useful for focusing on a specific part of the spectrum during playback.
          </p>

          <h3 className="font-semibold text-foreground mb-3">Zoom &amp; Scroll (bottom row)</h3>
          <ul className="space-y-2 text-base text-muted-foreground">
            <li><span className="text-foreground font-medium">Zoom slider</span> &mdash; Zooms in to see more detail in a shorter time window, or zooms out to see the full recording.</li>
            <li><span className="text-foreground font-medium">Fit to Screen button</span> &mdash; Resets the view to show the entire recording at once.</li>
            <li><span className="text-foreground font-medium">Scroll slider</span> &mdash; When zoomed in, slides the visible window left or right through the recording timeline.</li>
          </ul>
        </section>

        {/* Tips for Best Results */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-primary mb-4">Tips for Best Results</h2>
          <ul className="space-y-3 text-base text-muted-foreground">
            <li>Keep your device microphone 15&ndash;30 cm from the sound source for the clearest readings</li>
            <li>Use a quiet room &mdash; background noise appears as scattered colour on the display</li>
            <li>Sing or play at a steady, moderate volume for the most defined frequency lines</li>
            <li>Close other browser tabs if the display feels slow or laggy</li>
            <li>Chrome browser gives the best performance; Safari on iPhone works but may be less responsive</li>
          </ul>
        </section>

        {/* Troubleshooting */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-primary mb-4">Troubleshooting</h2>
          <dl className="space-y-4 text-base">
            <div>
              <dt className="text-foreground font-medium">No sound showing on the display?</dt>
              <dd className="text-muted-foreground">Check that your browser has microphone permission &mdash; look for the lock or microphone icon in the address bar.</dd>
            </div>
            <div>
              <dt className="text-foreground font-medium">Display looks noisy or messy?</dt>
              <dd className="text-muted-foreground">Reduce background noise in your environment.</dd>
            </div>
            <div>
              <dt className="text-foreground font-medium">App feels slow?</dt>
              <dd className="text-muted-foreground">Close other browser tabs and try Chrome.</dd>
            </div>
            <div>
              <dt className="text-foreground font-medium">On mobile?</dt>
              <dd className="text-muted-foreground">Hold your device steady and sing or play directly towards the microphone.</dd>
            </div>
          </dl>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-6 text-sm text-muted-foreground text-center space-y-1">
          <p>
            <Link href="/" className="text-primary hover:underline">overtonesinger.com</Link>
          </p>
          <p>Part of the Nestorium</p>
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
