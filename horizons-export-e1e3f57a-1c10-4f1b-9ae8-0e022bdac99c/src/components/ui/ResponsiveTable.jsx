import React from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Card, CardContent } from '@/components/ui/card';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx"

export const ResponsiveTable = ({ columns, data }) => {
  const isMobile = !useMediaQuery('(min-width: 768px)');

  if (isMobile) {
    return (
      <div className="space-y-4">
        {data.map((row, rowIndex) => (
          <Card key={rowIndex}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  {columns.map((col, colIndex) => {
                    if (col.accessor === 'actions') return null;
                    const CellContent = col.Cell;
                    return (
                      <div key={colIndex}>
                        <p className="text-sm font-medium text-gray-500">{col.Header}</p>
                        {CellContent ? <CellContent row={row} value={row[col.accessor]} /> : <p className="text-base text-gray-800">{String(row[col.accessor] ?? '')}</p>}
                      </div>
                    );
                  })}
                </div>
                {columns.some(c => c.accessor === 'actions') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 -mr-2"><MoreVertical className="w-5 h-5" /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {(() => {
                        const actionsCell = columns.find(c => c.accessor === 'actions').Cell({ row });
                        const actions = React.Children.toArray(actionsCell.props.children);
                        return actions.map((action, i) => (
                          <DropdownMenuItem key={i} onSelect={(e) => { e.preventDefault(); action.props.onClick(); }}>
                            {action.props.children}
                          </DropdownMenuItem>
                        ));
                      })()}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, i) => (
              <th key={i} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {col.Header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => {
                const CellContent = col.Cell;
                return (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {CellContent ? <CellContent row={row} value={row[col.accessor]} /> : String(row[col.accessor] ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};