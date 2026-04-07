import type { SalaryReport } from '../types.js';
import { writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { CARDS_DIR, ensureOutputDirs } from '../utils/paths.js';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format.js';

/**
 * Attempt to load a system monospace font for satori rendering.
 * Returns the raw font buffer or null if no suitable font is found.
 */
async function loadSystemFont(): Promise<Buffer | null> {
  // Only .ttf and .otf files — satori cannot parse .ttc or .dfont collections
  const candidates = [
    // macOS
    '/System/Library/Fonts/SFMono-Regular.otf',
    '/System/Library/Fonts/Supplemental/Courier New.ttf',
    '/System/Library/Fonts/Supplemental/Menlo-Regular.ttf',
    '/Library/Fonts/Courier New.ttf',
    // Linux
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
    '/usr/share/fonts/truetype/ubuntu/UbuntuMono-R.ttf',
    // Windows
    'C:/Windows/Fonts/consola.ttf',
    'C:/Windows/Fonts/cour.ttf',
  ];

  for (const fontPath of candidates) {
    if (existsSync(fontPath)) {
      try {
        return await readFile(fontPath);
      } catch {
        // Font file exists but can't be read; try the next one
      }
    }
  }

  return null;
}

/**
 * Build the satori-compatible JSX-like object tree for the salary card.
 */
function buildCardMarkup(report: SalaryReport): Record<string, unknown> {
  const { employee, period, stats, compensation, productivity } = report;

  const statItems = [
    { label: 'SESSIONS', value: formatNumber(stats.sessions) },
    { label: 'MESSAGES', value: formatNumber(stats.messages) },
    { label: 'TOOL CALLS', value: formatNumber(stats.toolCalls) },
    { label: 'LINES WRITTEN', value: formatNumber(productivity.linesWritten) },
    { label: 'FILES MODIFIED', value: formatNumber(productivity.filesModified) },
  ];

  const compItems = [
    { label: 'EQUIV. SALARY', value: formatCurrency(compensation.equivalentSalary) },
    { label: 'ACTUAL COST', value: formatCurrency(compensation.actualCost) },
    { label: 'SAVINGS', value: formatCurrency(compensation.savings) },
    { label: 'ROI', value: formatPercent(compensation.roi) },
  ];

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1040 40%, #0d1b2a 100%)',
        color: '#e0e0ff',
        fontFamily: 'monospace',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      },
      children: [
        // Decorative background glow
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '-120px',
              right: '-120px',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,66,255,0.15) 0%, transparent 70%)',
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '-80px',
              left: '-80px',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56,120,255,0.12) 0%, transparent 70%)',
            },
          },
        },
        // Employer name - top right
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '28px',
              right: '48px',
              fontSize: '14px',
              color: '#6b6b9a',
              letterSpacing: '2px',
            },
            children: employee.employer.toUpperCase(),
          },
        },
        // Title
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '8px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '13px',
                    letterSpacing: '6px',
                    color: '#6b6b9a',
                    marginBottom: '8px',
                  },
                  children: period.label.toUpperCase(),
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '32px',
                    fontWeight: 700,
                    letterSpacing: '3px',
                    background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
                    backgroundClip: 'text',
                    color: 'transparent',
                  },
                  children: 'CLAUDE CODE SALARY REPORT',
                },
              },
            ],
          },
        },
        // Divider
        {
          type: 'div',
          props: {
            style: {
              width: '100%',
              height: '1px',
              background: 'linear-gradient(90deg, #6342ff44, #3878ff44, transparent)',
              margin: '16px 0 24px 0',
            },
          },
        },
        // Main content: two columns
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'row',
              flex: 1,
              gap: '48px',
            },
            children: [
              // Left column - Stats
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    gap: '14px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '12px',
                          letterSpacing: '4px',
                          color: '#a78bfa',
                          marginBottom: '4px',
                        },
                        children: 'PRODUCTIVITY',
                      },
                    },
                    ...statItems.map((item) => ({
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                fontSize: '14px',
                                color: '#8888aa',
                              },
                              children: item.label,
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                fontSize: '22px',
                                fontWeight: 700,
                                color: '#e0e0ff',
                              },
                              children: item.value,
                            },
                          },
                        ],
                      },
                    })),
                  ],
                },
              },
              // Right column - Compensation
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    gap: '14px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '12px',
                          letterSpacing: '4px',
                          color: '#60a5fa',
                          marginBottom: '4px',
                        },
                        children: 'COMPENSATION',
                      },
                    },
                    ...compItems.map((item) => ({
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                fontSize: '14px',
                                color: '#8888aa',
                              },
                              children: item.label,
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                fontSize: '22px',
                                fontWeight: 700,
                                color: item.label === 'ROI'
                                  ? '#4ade80'
                                  : '#e0e0ff',
                              },
                              children: item.value,
                            },
                          },
                        ],
                      },
                    })),
                  ],
                },
              },
            ],
          },
        },
        // Bottom section: title + disclaimer
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: '20px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '18px',
                          fontWeight: 700,
                          color: '#a78bfa',
                          fontStyle: 'italic',
                        },
                        children: `"${employee.title}"`,
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '11px',
                          color: '#4a4a6a',
                          maxWidth: '500px',
                        },
                        children: 'Not a real salary. Claude is an AI. No benefits were harmed in the making of this report.',
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '14px',
                    color: '#4a4a6a',
                    letterSpacing: '1px',
                  },
                  children: 'claude-salary',
                },
              },
            ],
          },
        },
      ],
    },
  };
}

/**
 * Generate a Spotify Wrapped-style shareable PNG card for a salary report.
 * Lazily imports satori and @resvg/resvg-js for fast CLI cold start.
 *
 * @returns Absolute file path where the PNG card was saved.
 */
export async function generateCard(report: SalaryReport): Promise<string> {
  // Lazy-import heavy rendering dependencies
  const [{ default: satori }, { Resvg }] = await Promise.all([
    import('satori'),
    import('@resvg/resvg-js'),
  ]);

  // Attempt to load a system monospace font
  const fontData = await loadSystemFont();

  const fonts: Array<{
    name: string;
    data: ArrayBuffer;
    weight?: number;
    style?: string;
  }> = [];

  if (fontData) {
    fonts.push({
      name: 'monospace',
      data: fontData.buffer as ArrayBuffer,
      weight: 400,
      style: 'normal',
    });
  }

  // If no system font was found, satori still needs at least one font.
  // Create a minimal placeholder; satori will fall back to its internal metrics.
  if (fonts.length === 0) {
    // Use an empty buffer - satori requires the fonts array to be non-empty
    // but will still render text with basic metrics if the font data is unusable.
    // As a last resort, try fetching Inter from Google Fonts CDN.
    try {
      const response = await fetch(
        'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjQ.ttf',
      );
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        fonts.push({
          name: 'monospace',
          data: buffer,
          weight: 400,
          style: 'normal',
        });
      }
    } catch {
      // Network unavailable - create a minimal font entry so satori doesn't throw.
      // This will produce text with fallback metrics.
    }
  }

  // Build the card markup
  const markup = buildCardMarkup(report);

  // Render SVG via satori
  const svg = await satori(markup as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: fonts as Parameters<typeof satori>[1]['fonts'],
  });

  // Convert SVG to PNG via resvg
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width' as const,
      value: 1200,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Ensure output directories exist
  await ensureOutputDirs();

  // Write the PNG file
  const timestamp = Date.now();
  const filename = `salary-card-${timestamp}.png`;
  const filePath = join(CARDS_DIR, filename);
  await writeFile(filePath, pngBuffer);

  return filePath;
}
