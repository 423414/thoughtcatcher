import { useEffect, useRef } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';

interface Props {
  content: string;
}

export default function MindMapView({ content }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const transformer = new Transformer();
    // Extract headings from markdown to build the mind map
    const lines = content.split('\n');
    const mindmapLines: string[] = ['# 思维导图'];
    let currentH2 = '';
    let currentH3 = '';

    for (const line of lines) {
      if (line.startsWith('## ')) {
        currentH2 = line.replace('## ', '').trim();
        mindmapLines.push(`## ${currentH2}`);
        currentH3 = '';
      } else if (line.startsWith('### ')) {
        currentH3 = line.replace('### ', '').trim();
        if (currentH2) {
          mindmapLines.push(`### ${currentH3}`);
        }
      } else if (line.startsWith('- ') && currentH3) {
        mindmapLines.push(`- ${line.replace('- ', '').trim()}`);
      } else if (line.startsWith('- ') && !currentH3) {
        mindmapLines.push(`- ${line.replace('- ', '').trim()}`);
      }
    }

    const mindmapMarkdown = mindmapLines.join('\n');
    const { root } = transformer.transform(mindmapMarkdown);

    const mm = Markmap.create(svgRef.current);
    mm.setData(root);
    mm.fit();
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="markmap-container w-full rounded-xl border border-slate-200 bg-white overflow-hidden"
      style={{ minHeight: 400 }}
    >
      <svg ref={svgRef} className="w-full" style={{ height: 400 }} />
    </div>
  );
}
