import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One line of the scenario. `keyword` is Gherkin's; `text` is the step as written. */
interface SpecStep {
  readonly keyword: string;
  readonly text: string;
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="intro stack">
        <p class="path">specs / registration / sign-up.feature</p>

        <h1 class="display headline">Every feature starts as a sentence someone can check.</h1>

        <p class="prose lede">
          nmk is a starter template where the specification is the test. The scenario beside this is
          not an illustration of the sign-up flow — it is the sign-up flow, run against the API on
          every commit.
        </p>
      </div>

      <!-- The signature element: the repo's own acceptance scenario, typeset as the specification
           it is. Verdict marks are the one saturated colour on the page, and they appear nowhere
           else — passing is the only thing this project treats as an achievement. -->
      <figure class="spec">
        <figcaption class="spec__caption">
          <span class="spec__feature">Feature: Sign Up</span>
          <span class="spec__scenario">Scenario: Successful sign-up</span>
        </figcaption>

        <ol class="spec__steps">
          @for (step of steps; track step.text; let i = $index) {
            <li class="spec__step" [style.--stagger]="i">
              <span class="spec__mark" aria-hidden="true">&#10003;</span>
              <span class="spec__keyword">{{ step.keyword }}</span>
              <span class="spec__text">{{ step.text }}</span>
            </li>
          }
        </ol>

        <p class="spec__footer">
          {{ steps.length }} steps &middot; verified by the acceptance suite on every commit
        </p>
      </figure>

      <div class="outro stack--tight stack">
        <p class="prose">Create an account and you will walk it yourself.</p>

        <div class="cta">
          <a class="button button--primary" routerLink="/sign-up">Create an account</a>
          <a class="button button--quiet" routerLink="/login">Log in</a>
        </div>
      </div>
    </div>
  `,
  styles: `
    .page {
      display: grid;
      /* One capped, centred column until there is room for two. Without the cap, the tablet band
         between the phone layout and the two-column breakpoint stretches the spec card to the full
         68rem while its content fills barely half of it. */
      grid-template-columns: minmax(0, 42rem);
      justify-content: center;
      gap: var(--space-6);
      max-width: 68rem;
      margin: 0 auto;
      padding: var(--space-8) var(--space-5) var(--space-7);
    }

    /**
     * Wide enough for two columns: the argument on the left, the specification pinned beside it as
     * the artifact it is. DOM order stays intro → spec → outro, which is the order it should be
     * read in at either width — the grid only changes where the boxes sit, never the sequence.
     */
    @media (min-width: 64rem) {
      .page {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
        justify-content: normal;
        gap: var(--space-6) var(--space-8);
        align-items: start;
      }

      .intro {
        grid-area: 1 / 1;
      }

      .spec {
        grid-area: 1 / 2 / span 2;
      }

      .outro {
        grid-area: 2 / 1;
      }
    }

    /* A file path, set as one. The global .eyebrow uppercases, which fights a lowercase filename. */
    .path {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-wide);
      color: var(--ink-soft);
    }

    .headline {
      font-size: clamp(var(--text-2xl), 5vw, var(--text-3xl));
    }

    .lede {
      font-size: var(--text-lg);
    }

    .spec {
      margin: 0;
      padding: var(--space-5) var(--space-6);
      border: 1px solid var(--rule);
      border-left: 3px solid var(--verdict);
      border-radius: var(--radius-lg);
      background-color: var(--sheet);
      box-shadow: var(--shadow-md);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      overflow-x: auto;
    }

    .spec__caption {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--rule);
    }

    .spec__feature {
      font-weight: 700;
      color: var(--ink);
    }

    .spec__scenario {
      padding-left: var(--space-4);
      color: var(--ink-soft);
    }

    .spec__steps {
      display: grid;
      gap: var(--space-2);
      margin: var(--space-4) 0;
      padding: 0;
      list-style: none;
    }

    .spec__step {
      display: grid;
      grid-template-columns: auto 3.5rem 1fr;
      gap: var(--space-3);
      align-items: baseline;
      /* The page's one orchestrated moment: the steps settle in order, the way a suite reports.
         Reduced motion collapses the duration to nothing and they are simply there.

         Transform only, never opacity. Fading text in means rendering it at every contrast ratio
         between nothing and legible on the way; the accessibility audit measured one of these rows
         at 1.03:1 mid-fade. Sliding keeps every step readable for the whole animation. */
      animation: step-settles var(--duration-base) var(--ease) backwards;
      animation-delay: calc(var(--stagger) * 70ms);
    }

    @keyframes step-settles {
      from {
        transform: translateY(0.35rem);
      }
    }

    .spec__mark {
      color: var(--verdict);
      font-weight: 700;
    }

    .spec__keyword {
      color: var(--indigo);
      font-weight: 600;
    }

    .spec__text {
      color: var(--ink);
    }

    .spec__footer {
      padding-top: var(--space-4);
      border-top: 1px solid var(--rule);
      color: var(--ink-soft);
      font-size: var(--text-xs);
    }

    .cta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
  `,
})
export class HomePage {
  /**
   * An illustrative excerpt of the sign-up scenario in
   * `acceptance-tests/specs/registration/sign-up.feature` — not a live-synced copy of it.
   */
  protected readonly steps: readonly SpecStep[] = [
    { keyword: 'Given', text: "Ariana doesn't have an account" },
    { keyword: 'When', text: 'he signs up' },
    { keyword: 'Then', text: 'he should be able to login' },
    { keyword: 'And', text: 'sees his profile' },
  ];
}
