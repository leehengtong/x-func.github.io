// Utility function to convert title to slug
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export interface Product {
  title: string
  description: string
  icon: string
  features: string[]
}

// Get all products (shared source of truth)
export function getProducts(): Product[] {
  return [
    {
      title: 'Image Editor',
      description: 'Transform and enhance your images with cutting-edge AI technology. Remove backgrounds, adjust colors, apply artistic styles, and more with just a few clicks.',
      icon: '🎨',
      features: [
        'Background removal',
        'Style transfer',
        'Color correction',
        'Object removal',
        'Enhancement tools'
      ]
    },
    {
      title: 'GIF Editor',
      description: 'View, analyze, and extract frames from GIF animations. Play, pause, and navigate through frames with precision. Perfect for understanding GIF structure and extracting individual frames.',
      icon: '🎬',
      features: [
        'Frame extraction',
        'Play/pause controls',
        'Frame-by-frame navigation',
        'Zoom and pan',
        'Frame analysis'
      ]
    },
    {
      title: 'Voice Editor',
      description: 'Edit and enhance audio recordings with professional tools. Remove background noise, adjust pitch and tempo, add effects, and transcribe speech to text. Perfect for podcasters, content creators, and professionals.',
      icon: '🎤',
      features: [
        'Noise reduction',
        'Pitch and tempo adjustment',
        'Speech-to-text transcription',
        'Audio enhancement',
        'Effect application'
      ]
    },
    {
      title: 'Video Editor',
      description: 'Create stunning videos with intuitive editing tools. Trim, cut, merge clips, add transitions, apply filters, and export in various formats. Professional-grade editing made simple and accessible.',
      icon: '🎥',
      features: [
        'Clip trimming and merging',
        'Transitions and effects',
        'Filter application',
        'Multiple format export',
        'Timeline editing'
      ]
    },
    {
      title: 'New Language Learning',
      description: 'Master new languages faster with personalized AI tutoring. Interactive lessons, pronunciation practice, and adaptive learning paths tailored to your needs.',
      icon: '🌐',
      features: [
        'Personalized curriculum',
        'Voice recognition',
        'Real-time feedback',
        'Grammar analysis',
        'Cultural context'
      ]
    },
    {
      title: 'Stock Market Analysis',
      description: 'Make informed investment decisions with AI-powered market analysis. Identify trends, predict movements, and get actionable insights from vast amounts of market data.',
      icon: '📈',
      features: [
        'Trend identification',
        'Risk assessment',
        'Portfolio optimization',
        'Market predictions',
        'Real-time alerts'
      ]
    },
    {
      title: 'News Aggregation',
      description: 'Stay informed with AI-curated news. Get the most relevant and useful information from multiple sources, filtered and summarized for your interests.',
      icon: '📰',
      features: [
        'Multi-source aggregation',
        'Relevance scoring',
        'Bias detection',
        'Summary generation',
        'Personalized feed'
      ]
    },
    {
      title: 'Log Viewer',
      description: 'Analyze, search, and visualize logs effortlessly. Filter, highlight, and extract insights from log files to identify issues and trends quickly.',
      icon: '📑',
      features: [
        'Log filtering & search',
        'Error & warning highlighting',
        'Timestamp navigation',
        'Pattern recognition',
        'Real-time log streaming'
      ]
    },
    {
      title: 'Text Extraction',
      description: 'Extract key information, entities, or structured data from raw text, PDFs, or images using powerful AI-driven methods. Simplify data mining and processing.',
      icon: '📝',
      features: [
        'OCR (image/PDF to text)',
        'Named entity extraction',
        'Pattern matching',
        'Bulk processing',
        'Export structured data'
      ]
    },
  ]
}

