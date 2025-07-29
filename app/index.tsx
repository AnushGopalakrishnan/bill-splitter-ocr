import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function BillSplitterApp() {
  const [image, setImage] = useState(null);
  const [items, setItems] = useState([]);
  const [names, setNames] = useState(['']);
  const [splits, setSplits] = useState({});
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    setImage(URL.createObjectURL(file));
    setLoading(true);

    try {
      const {
        data: { text },
      } = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log(m),
      });

      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      const extractedItems = lines.map(line => {
        const match = line.match(/^(.*[^0-9])([\d,.]+)$/);
        return match ? { name: match[1].trim(), price: parseFloat(match[2].replace(/,/g, '')) } : null;
      }).filter(Boolean);
      setItems(extractedItems);
    } catch (error) {
      console.error('OCR failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitChange = (itemIndex, person) => {
    const key = itemIndex;
    const current = splits[key] || [];
    const updated = current.includes(person) ? current.filter(p => p !== person) : [...current, person];
    setSplits({ ...splits, [key]: updated });
  };

  const autoDistributeAll = () => {
    const allSplits = {};
    items.forEach((_, idx) => {
      allSplits[idx] = names.filter(n => n.trim() !== '');
    });
    setSplits(allSplits);
  };

  const calculateTotals = () => {
    const totals = {};
    names.forEach(name => totals[name] = 0);

    items.forEach((item, index) => {
      const splitPeople = splits[index] || [];
      const perPerson = item.price / splitPeople.length;
      splitPeople.forEach(person => {
        totals[person] += perPerson;
      });
    });

    return totals;
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Bill Splitter with OCR</h1>

      <Input type="file" accept="image/*" onChange={handleImageUpload} />

      {image && <img src={image} alt="Uploaded" className="max-h-64 object-contain mt-4" />}

      {loading && <p className="text-blue-600">Reading bill items with OCR...</p>}

      <div>
        <h2 className="font-semibold mt-4">People:</h2>
        {names.map((name, idx) => (
          <Input
            key={idx}
            className="my-1"
            value={name}
            onChange={(e) => {
              const newNames = [...names];
              newNames[idx] = e.target.value;
              setNames(newNames);
            }}
          />
        ))}
        <Button className="mt-2" onClick={() => setNames([...names, ''])}>Add Person</Button>
      </div>

      <div>
        <h2 className="font-semibold mt-4 flex items-center justify-between">
          <span>Items:</span>
          {items.length > 0 && <Button variant="outline" size="sm" onClick={autoDistributeAll}>Auto Split All</Button>}
        </h2>
        {items.map((item, idx) => (
          <div key={idx} className="border p-2 my-2 rounded">
            <div>{item.name} - ₹{item.price.toFixed(2)}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {names.map((name, nIdx) => (
                <label key={nIdx} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={splits[idx]?.includes(name) || false}
                    onChange={() => handleSplitChange(idx, name)}
                  />
                  {name || `Person ${nIdx + 1}`}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div>
          <h2 className="font-semibold mt-4">Totals:</h2>
          <ul>
            {Object.entries(calculateTotals()).map(([name, total], idx) => (
              <li key={idx}>{name || `Person ${idx + 1}`}: ₹{total.toFixed(2)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
