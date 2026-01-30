import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

// Lista città italiane e svizzere principali
const CITIES = [
  // Svizzera - Canton Ticino e zone limitrofe
  'Lugano', 'Bellinzona', 'Locarno', 'Mendrisio', 'Chiasso', 'Biasca', 
  'Giubiasco', 'Gordola', 'Ascona', 'Minusio', 'Muralto', 'Paradiso',
  'Massagno', 'Viganello', 'Pregassona', 'Breganzona', 'Comano', 'Cadro',
  'Melide', 'Morcote', 'Capolago', 'Riva San Vitale', 'Agno', 'Magliaso',
  'Caslano', 'Ponte Tresa', 'Stabio', 'Vacallo', 'Morbio Inferiore',
  'Balerna', 'Coldrerio', 'Novazzano', 'Ligornetto', 'Arbedo-Castione',
  'Cadenazzo', 'Magadino', 'Tenero', 'Brissago', 'Losone', 'Orselina',
  // Altre città svizzere
  'Zurigo', 'Ginevra', 'Basilea', 'Berna', 'Losanna', 'Winterthur',
  'San Gallo', 'Lucerna', 'Friburgo', 'Neuchâtel', 'Thun', 'Sion',
  'Montreux', 'Vevey', 'Nyon', 'Morges', 'Yverdon-les-Bains',
  
  // Italia - Lombardia
  'Milano', 'Como', 'Varese', 'Lecco', 'Bergamo', 'Brescia', 'Monza',
  'Pavia', 'Cremona', 'Mantova', 'Lodi', 'Sondrio', 'Busto Arsizio',
  'Gallarate', 'Saronno', 'Legnano', 'Rho', 'Sesto San Giovanni',
  'Cinisello Balsamo', 'Cologno Monzese', 'Desio', 'Cantù', 'Erba',
  'Mariano Comense', 'Seregno', 'Lissone', 'Meda', 'Cesano Maderno',
  'Limbiate', 'Paderno Dugnano', 'Novate Milanese', 'Cusano Milanino',
  'Cernusco sul Naviglio', 'Pioltello', 'Segrate', 'Vimodrone',
  'Cassano d\'Adda', 'Melzo', 'Gorgonzola', 'Vimercate', 'Arcore',
  'Villasanta', 'Biassono', 'Vedano al Lambro', 'Macherio', 'Sovico',
  
  // Italia - Piemonte
  'Torino', 'Novara', 'Alessandria', 'Asti', 'Cuneo', 'Vercelli',
  'Biella', 'Verbania', 'Domodossola', 'Arona', 'Borgomanero', 'Omegna',
  'Stresa', 'Baveno', 'Pallanza', 'Intra', 'Gravellona Toce',
  
  // Italia - Valle d'Aosta
  'Aosta', 'Courmayeur', 'Saint-Vincent', 'Châtillon',
  
  // Italia - Veneto
  'Venezia', 'Verona', 'Padova', 'Vicenza', 'Treviso', 'Rovigo', 'Belluno',
  
  // Italia - Emilia-Romagna
  'Bologna', 'Parma', 'Modena', 'Reggio Emilia', 'Ravenna', 'Rimini',
  'Ferrara', 'Forlì', 'Cesena', 'Piacenza',
  
  // Italia - Toscana
  'Firenze', 'Pisa', 'Livorno', 'Siena', 'Lucca', 'Arezzo', 'Prato',
  'Pistoia', 'Grosseto', 'Massa', 'Carrara',
  
  // Italia - Lazio
  'Roma', 'Latina', 'Frosinone', 'Viterbo', 'Rieti',
  
  // Italia - Campania
  'Napoli', 'Salerno', 'Caserta', 'Avellino', 'Benevento',
  
  // Italia - Puglia
  'Bari', 'Lecce', 'Taranto', 'Foggia', 'Brindisi', 'Barletta',
  
  // Italia - Sicilia
  'Palermo', 'Catania', 'Messina', 'Siracusa', 'Ragusa', 'Trapani',
  
  // Italia - Sardegna
  'Cagliari', 'Sassari', 'Nuoro', 'Oristano', 'Olbia', 'Alghero',
  
  // Italia - Altre regioni
  'Genova', 'La Spezia', 'Savona', 'Imperia', // Liguria
  'Trieste', 'Udine', 'Pordenone', 'Gorizia', // Friuli
  'Trento', 'Bolzano', 'Merano', 'Rovereto', // Trentino
  'Ancona', 'Pesaro', 'Fano', 'Urbino', // Marche
  'Perugia', 'Terni', 'Foligno', 'Spoleto', // Umbria
  'L\'Aquila', 'Pescara', 'Chieti', 'Teramo', // Abruzzo
  'Campobasso', 'Isernia', // Molise
  'Potenza', 'Matera', // Basilicata
  'Catanzaro', 'Reggio Calabria', 'Cosenza', 'Crotone', // Calabria
];

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CityAutocomplete({ value, onChange, placeholder = 'Cerca città...', className }: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    if (inputValue.length >= 1) {
      const searchTerm = inputValue.toLowerCase();
      // Prima le città che iniziano con il termine, poi quelle che lo contengono
      const startsWithFilter = CITIES.filter(city =>
        city.toLowerCase().startsWith(searchTerm)
      );
      const containsFilter = CITIES.filter(city =>
        city.toLowerCase().includes(searchTerm) && 
        !city.toLowerCase().startsWith(searchTerm)
      );
      const filtered = [...startsWithFilter, ...containsFilter].slice(0, 10);
      setFilteredCities(filtered);
      setIsOpen(filtered.length > 0);
      setHighlightedIndex(-1);
    } else {
      setFilteredCities([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (city: string) => {
    onChange(city);
    setIsOpen(false);
    setFilteredCities([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredCities.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredCities[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.length >= 2 && filteredCities.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {isOpen && filteredCities.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredCities.map((city, index) => (
            <div
              key={city}
              onClick={() => handleSelect(city)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 cursor-pointer text-popover-foreground',
                'hover:bg-accent hover:text-accent-foreground',
                index === highlightedIndex && 'bg-accent text-accent-foreground'
              )}
            >
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{city}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
