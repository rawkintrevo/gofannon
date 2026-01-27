import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroStars} />
      <div className={styles.heroGlow} />
      <div className={styles.heroClouds}>
        <span className={styles.cloud} />
        <span className={clsx(styles.cloud, styles.cloudSmall)} />
        <span className={clsx(styles.cloud, styles.cloudRight)} />
      </div>
      <div className="container">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.heroBadge}>Prototype-ready agents</div>
            <Heading as="h1" className={styles.heroTitle}>
              Prototype AI Agents
              <br />
              and Web UIs Fast.
            </Heading>
            <p className={styles.heroSubtitle}>
              Empower subject matter experts. Build flows, preview interactions,
              and share working agent-driven experiences in days, not weeks.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} to="/docs/quickstart">
                Get Started
              </Link>
              <Link
                className={styles.secondaryButton}
                href="https://github.com/the-ai-alliance/gofannon">
                View on GitHub
              </Link>
            </div>
          </div>
          <div className={styles.heroPanel}>
            <div className={styles.panelTitle}>Prototype → Design → Deploy</div>
            <div className={styles.panelSteps}>
              <div className={styles.stepCard}>
                <span className={clsx(styles.stepIcon, styles.stepPrototype)} />
                <span className={styles.stepLabel}>Prototype</span>
              </div>
              <div className={styles.stepArrow} />
              <div className={styles.stepCard}>
                <span className={clsx(styles.stepIcon, styles.stepDesign)} />
                <span className={styles.stepLabel}>Design UI</span>
              </div>
              <div className={styles.stepArrow} />
              <div className={styles.stepCard}>
                <span className={clsx(styles.stepIcon, styles.stepDeploy)} />
                <span className={styles.stepLabel}>Deploy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.heroDivider} />
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Prototype AI agents and web UI demos fast.">
      <div className={styles.homePage}>
        <HomepageHeader />
        <main className={styles.main}>
          <HomepageFeatures />
        </main>
      </div>
    </Layout>
  );
}
