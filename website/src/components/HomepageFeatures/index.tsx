import type {ReactNode} from 'react';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
  iconClass: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Guided Agent Flows',
    iconClass: styles.iconFlows,
    description: (
      <>
        Export your tools to any major AI framework with a single command. Shape
        repeatable workflows without writing custom plumbing.
      </>
    ),
  },
  {
    title: 'Rapid UI Previews',
    iconClass: styles.iconPreview,
    description: (
      <>
        Explore a growing collection of pre-built UI widgets and data panels.
        Move from idea to stakeholder walkthroughs in hours.
      </>
    ),
  },
  {
    title: 'Stakeholder-Ready Demos',
    iconClass: styles.iconDemos,
    description: (
      <>
        Prototype agent workflows and UIs in one place. Share polished demos
        fast and iterate based on real feedback.
      </>
    ),
  },
];

function Feature({title, description, iconClass}: FeatureItem) {
  return (
    <div className={styles.featureCard}>
      <span className={`${styles.featureIcon} ${iconClass}`} aria-hidden />
      <Heading as="h3" className={styles.featureTitle}>
        {title}
      </Heading>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featureGrid}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
