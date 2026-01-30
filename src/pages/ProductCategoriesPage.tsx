import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Search,
  Package,
  FileText,
  ShieldCheck,
  Zap,
  Globe,
  Tag,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getCategories } from '@/services/api';
import type { Category } from '@/types/database';

// Fallback data in case the API is unreachable
const fallbackCategories: Category[] = [
  {
    id: 'electronics',
    name: 'Electronics & IT',
    icon: '💻',
    description: 'All electronic devices and IT equipment',
    regulations: ['CE', 'RoHS', 'WEEE', 'EMC', 'RED'],
    subcategories: [
      'Smartphone', 'Tablet', 'Laptop', 'Desktop PC', 'Server', 'Monitor', 'TV/Television',
      'Headphones', 'Speakers', 'Soundbar', 'HiFi System', 'Microphone',
      'Printer', 'Scanner', 'Router', 'Switch', 'NAS Storage',
      'External Drive', 'USB Stick', 'Memory Card',
      'Webcam', 'Projector', 'Digital Camera', 'Video Camera',
      'Game Console', 'Gaming PC', 'VR Headset',
      'Smartwatch', 'Fitness Tracker', 'E-Reader',
      'IoT Device', 'Smart Speaker', 'Smart Display',
      'Drone', 'E-Scooter', 'E-Bike Display',
    ],
  },
  {
    id: 'household-electronics',
    name: 'Household Appliances',
    icon: '🏠',
    description: 'Electrical household appliances (white goods, small appliances)',
    regulations: ['CE', 'RoHS', 'WEEE', 'Energy Label', 'Ecodesign'],
    subcategories: [
      'Refrigerator', 'Freezer', 'Fridge-Freezer Combo',
      'Washing Machine', 'Dryer', 'Washer-Dryer',
      'Dishwasher', 'Stove', 'Oven', 'Microwave',
      'Range Hood', 'Induction Cooktop',
      'Fully Automatic Coffee Machine', 'Coffee Maker', 'Kettle', 'Toaster',
      'Blender', 'Food Processor', 'Hand Mixer', 'Immersion Blender',
      'Vacuum Cleaner', 'Robot Vacuum', 'Steam Cleaner',
      'Iron', 'Steam Iron Station', 'Sewing Machine',
      'Air Conditioner', 'Fan', 'Fan Heater', 'Air Purifier',
      'Humidifier', 'Dehumidifier',
      'Hair Dryer', 'Flat Iron', 'Curling Iron', 'Hair Clipper',
      'Shaver', 'Epilator', 'Electric Toothbrush',
    ],
  },
  {
    id: 'lighting',
    name: 'Lighting',
    icon: '💡',
    description: 'Light sources and luminaires',
    regulations: ['CE', 'RoHS', 'WEEE', 'Energy Label', 'Ecodesign'],
    subcategories: [
      'LED Bulb E27', 'LED Bulb E14', 'LED Bulb GU10', 'LED Bulb G9',
      'LED Tube T8', 'LED Panel', 'LED Strip',
      'Halogen Lamp', 'Compact Fluorescent Lamp',
      'Ceiling Light', 'Wall Light', 'Floor Lamp', 'Table Lamp',
      'Pendant Light', 'Recessed Spotlight', 'Outdoor Light',
      'Smart Lighting', 'Smart Bulb', 'Light Control',
      'Emergency Lighting', 'Exit Sign Light', 'Safety Lighting',
      'UV Lamp', 'Infrared Lamp', 'Grow Light',
      'Flashlight', 'Headlamp', 'Work Light',
    ],
  },
  {
    id: 'textiles',
    name: 'Textiles & Fashion',
    icon: '👕',
    description: 'Clothing, footwear and textile products',
    regulations: ['REACH', 'Textile Labelling', 'ESPR/DPP'],
    subcategories: [
      'T-Shirt', 'Shirt', 'Blouse', 'Sweater', 'Jacket', 'Coat',
      'Trousers', 'Jeans', 'Skirt', 'Dress', 'Suit',
      'Underwear', 'Socks', 'Tights',
      'Sportswear', 'Functional Clothing', 'Outdoor Clothing',
      'Workwear', 'Professional Clothing', 'Protective Clothing',
      'Children\'s Clothing', 'Baby Clothing',
      'Shoes', 'Sneakers', 'Boots', 'Sandals', 'Sports Shoes',
      'Bags', 'Backpacks', 'Suitcases',
      'Belts', 'Scarves', 'Hats', 'Gloves',
      'Home Textiles', 'Bedding', 'Towels', 'Curtains',
      'Carpets', 'Mats', 'Upholstery Covers',
      'Technical Textiles', 'Geotextiles', 'Agricultural Textiles',
    ],
  },
  {
    id: 'toys',
    name: 'Toys',
    icon: '🧸',
    description: 'Toys for all age groups',
    regulations: ['CE', 'Toy Safety Directive', 'REACH', 'EN 71'],
    subcategories: [
      'Electronic Toys', 'Learning Computer', 'Interactive Dolls',
      'Remote Control Car', 'Drone (Toy)', 'Robot',
      'Plush Toys', 'Stuffed Animals', 'Dolls',
      'LEGO/Building Blocks', 'Construction Toys',
      'Board Games', 'Card Games', 'Puzzles',
      'Outdoor Toys', 'Sand Toys', 'Water Toys',
      'Sports Toys', 'Balls', 'Swings',
      'Musical Toys', 'Instruments (Toy)',
      'Creative Toys', 'Painting Sets', 'Craft Sets',
      'Educational Toys', 'Experiment Kits', 'STEM Toys',
      'Baby Toys', 'Rattles', 'Teething Rings',
      'Toy Vehicles', 'Model Cars', 'Toy Train',
      'Action Figures', 'Collectible Figures',
      'Costumes', 'Role Play Accessories',
    ],
  },
  {
    id: 'furniture',
    name: 'Furniture & Furnishings',
    icon: '🛋️',
    description: 'Furniture for living and working spaces',
    regulations: ['REACH', 'Timber Regulation', 'ESPR/DPP'],
    subcategories: [
      'Sofa', 'Armchair', 'Chair', 'Stool', 'Bench',
      'Dining Table', 'Coffee Table', 'Desk', 'Side Table',
      'Wardrobe', 'Chest of Drawers', 'Sideboard', 'Shelf', 'Display Cabinet',
      'Bed', 'Bed Frame', 'Loft Bed', 'Children\'s Bed',
      'Mattress', 'Slatted Frame', 'Topper',
      'Kitchen Furniture', 'Kitchen Unit', 'Countertop',
      'Bathroom Furniture', 'Washbasin', 'Mirror Cabinet',
      'Office Furniture', 'Office Chair', 'Conference Table',
      'Garden Furniture', 'Lounge Furniture', 'Sun Lounger',
      'Children\'s Furniture', 'Changing Table', 'Children\'s Desk',
      'Upholstered Furniture', 'Sofa Bed', 'Chaise Longue',
    ],
  },
  {
    id: 'cosmetics',
    name: 'Cosmetics & Personal Care',
    icon: '💄',
    description: 'Cosmetic products and personal care items',
    regulations: ['Cosmetics Regulation (EC) 1223/2009', 'REACH', 'CPNP'],
    subcategories: [
      'Facial Care', 'Day Cream', 'Night Cream', 'Serum',
      'Cleansing', 'Toner', 'Exfoliant', 'Face Mask',
      'Body Care', 'Body Lotion', 'Shower Gel', 'Soap',
      'Hair Care', 'Shampoo', 'Conditioner', 'Hair Treatment',
      'Styling', 'Hairspray', 'Gel', 'Wax',
      'Makeup', 'Foundation', 'Concealer', 'Powder',
      'Lipstick', 'Lip Gloss', 'Lip Liner',
      'Mascara', 'Eyeliner', 'Eye Shadow',
      'Nail Polish', 'Nail Care',
      'Perfume', 'Eau de Toilette', 'Deodorant',
      'Sunscreen', 'Self-Tanner', 'After-Sun',
      'Men\'s Grooming', 'Shaving Cream', 'Aftershave',
      'Baby Care', 'Children\'s Care',
      'Natural Cosmetics', 'Organic Cosmetics',
    ],
  },
  {
    id: 'food-contact',
    name: 'Food Contact Materials',
    icon: '🍽️',
    description: 'Materials and articles in contact with food',
    regulations: ['Reg (EC) 1935/2004', 'Reg (EU) 10/2011', 'LFGB'],
    subcategories: [
      'Tableware', 'Plates', 'Bowls', 'Cups',
      'Glasses', 'Wine Glasses', 'Beer Glasses',
      'Cutlery', 'Knives', 'Forks', 'Spoons',
      'Cooking Pots', 'Pans', 'Casserole Dishes',
      'Kitchen Utensils', 'Cutting Boards', 'Cooking Spoons',
      'Food Containers', 'Storage Containers', 'Fresh-keeping Boxes',
      'Drinking Bottles', 'Thermos Flasks', 'Insulated Mugs',
      'Baking Forms', 'Muffin Forms', 'Cake Forms',
      'Grill Accessories', 'Grill Grate', 'Grill Tongs',
      'Baby Bottles', 'Pacifiers', 'Weaning Tableware',
      'Disposable Tableware', 'Disposable Cutlery',
      'Food Packaging', 'Foils', 'Bags',
      'Kitchen Appliances', 'Blender', 'Juicer',
    ],
  },
  {
    id: 'batteries',
    name: 'Batteries & Accumulators',
    icon: '🔋',
    description: 'All types of batteries and accumulators',
    regulations: ['EU Battery Regulation', 'BattG', 'Digital Battery Passport'],
    subcategories: [
      'Device Battery AA', 'Device Battery AAA', 'Device Battery C', 'Device Battery D',
      'Button Cell', 'Lithium Button Cell', 'Silver Oxide Button Cell',
      '9V Block', 'Special Batteries',
      'Lithium-Ion Battery', 'Lithium-Polymer Battery',
      'NiMH Battery', 'NiCd Battery',
      'Power Bank', 'Laptop Battery', 'Smartphone Battery',
      'E-Bike Battery', 'E-Scooter Battery', 'LMT Battery',
      'Starter Battery (SLI)', 'Motorcycle Battery',
      'Industrial Battery', 'UPS Battery', 'Forklift Battery',
      'EV Battery', 'Traction Battery',
      'Solar Storage', 'Home Storage',
      'Lead-Acid Battery', 'AGM Battery', 'Gel Battery',
    ],
  },
  {
    id: 'chemicals',
    name: 'Chemicals & Mixtures',
    icon: '🧪',
    description: 'Chemical substances and preparations',
    regulations: ['REACH', 'CLP', 'Biocidal Products Regulation', 'Detergents Regulation'],
    subcategories: [
      'Cleaning Agents', 'All-Purpose Cleaner', 'Glass Cleaner', 'Bathroom Cleaner',
      'Detergents', 'Heavy-Duty Detergent', 'Color Detergent', 'Fabric Softener',
      'Dishwashing Detergent', 'Hand Dishwashing Liquid', 'Machine Dishwashing Detergent',
      'Paints', 'Wall Paint', 'Wood Paint', 'Metal Paint',
      'Lacquers', 'Clear Coat', 'Colored Lacquer', 'Wood Stain',
      'Thinners', 'Solvents', 'Brush Cleaner',
      'Adhesives', 'Wood Glue', 'Super Glue', 'Mounting Adhesive',
      'Sealants', 'Silicone', 'Acrylic', 'PU Foam',
      'Oils', 'Motor Oil', 'Hydraulic Oil', 'Lubricating Oil',
      'Antifreeze', 'Radiator Antifreeze',
      'Insecticides', 'Pesticides', 'Herbicides',
      'Fertilizers', 'Plant Protection Products',
      'Industrial Chemicals', 'Acids', 'Alkalis',
    ],
  },
  {
    id: 'medical',
    name: 'Medical Devices',
    icon: '🏥',
    description: 'Medical devices and aids',
    regulations: ['MDR (EU) 2017/745', 'IVDR (EU) 2017/746', 'CE'],
    subcategories: [
      'Class I - Non-invasive', 'Dressing Material', 'Compression Stockings',
      'Class I - Sterile', 'Sterile Disposable Gloves',
      'Class IIa', 'Blood Pressure Monitor', 'Thermometer', 'Hearing Aid',
      'Class IIb', 'Ventilator', 'Infusion Pump', 'Defibrillator',
      'Class III', 'Pacemaker', 'Implants',
      'IVD Class A', 'Pregnancy Test', 'Urine Test',
      'IVD Class B', 'Blood Glucose Meter',
      'IVD Class C', 'HIV Test', 'Hepatitis Test',
      'IVD Class D', 'Blood Typing',
      'Mobility Aids', 'Rollator', 'Wheelchair', 'Walking Aid',
      'Orthopedic Insoles', 'Bandages', 'Orthoses',
    ],
  },
  {
    id: 'construction',
    name: 'Construction Products',
    icon: '🏗️',
    description: 'Building materials and construction products',
    regulations: ['Construction Products Regulation (EU) 305/2011', 'CE', 'DoP'],
    subcategories: [
      'Insulation Materials', 'Mineral Wool', 'EPS', 'XPS', 'PUR',
      'Windows', 'Doors', 'Gates',
      'Floor Coverings', 'Laminate', 'Parquet', 'Vinyl', 'Tiles',
      'Sanitary Products', 'Toilet', 'Washbasin', 'Bathtub', 'Shower',
      'Heating', 'Radiators', 'Underfloor Heating', 'Heat Pump',
      'Electrical Installation', 'Sockets', 'Switches', 'Cables',
      'Pipes', 'Fittings', 'Taps',
      'Concrete', 'Mortar', 'Screed',
      'Bricks', 'Sand-lime Brick', 'Aerated Concrete',
      'Wood-based Materials', 'OSB', 'MDF', 'Plywood',
      'Roof Tiles', 'Roofing Membranes', 'Roof Insulation',
      'Facade', 'Plaster', 'ETICS',
    ],
  },
  {
    id: 'machinery',
    name: 'Machinery & Tools',
    icon: '🔧',
    description: 'Machinery and power tools',
    regulations: ['Machinery Directive 2006/42/EC', 'CE', 'Outdoor Noise Directive'],
    subcategories: [
      'Drill', 'Rotary Hammer', 'Impact Drill',
      'Angle Grinder', 'Orbital Sander', 'Belt Sander',
      'Circular Saw', 'Jigsaw', 'Miter Saw', 'Chain Saw',
      'Cordless Screwdriver', 'Impact Wrench',
      'Compressor', 'Pneumatic Tools',
      'Welding Machine', 'Soldering Station',
      'Lawn Mower', 'Grass Trimmer', 'Hedge Trimmer',
      'Pressure Washer', 'Wet Vacuum',
      'Industrial Machine', 'CNC Machine', 'Milling Machine', 'Lathe',
      'Conveyor Technology', 'Forklift', 'Pallet Truck',
      'Air Compressor', 'Hydraulic Pump',
      'Measuring Instruments', 'Multimeter', 'Oscilloscope',
    ],
  },
  {
    id: 'automotive',
    name: 'Automotive Parts & Accessories',
    icon: '🚗',
    description: 'Vehicle parts and automotive accessories',
    regulations: ['ECE Regulations', 'Type Approval', 'REACH'],
    subcategories: [
      'Tires', 'Summer Tires', 'Winter Tires', 'All-Season Tires',
      'Rims', 'Alloy Rims', 'Steel Rims',
      'Brake Discs', 'Brake Pads', 'Brake Fluid',
      'Oil Filter', 'Air Filter', 'Fuel Filter',
      'Headlights', 'Tail Lights', 'Turn Signals',
      'Exhaust', 'Catalytic Converter', 'Particulate Filter',
      'Battery', 'Starter Motor', 'Alternator',
      'Coolant Hoses', 'V-Belt', 'Timing Belt',
      'Shock Absorbers', 'Springs', 'Suspension',
      'Windshield Wipers', 'Windshield Washer',
      'Interior', 'Seat Covers', 'Floor Mats',
      'Navigation', 'Car Radio', 'Dashcam',
      'Child Seat', 'Infant Carrier',
    ],
  },
  {
    id: 'sports',
    name: 'Sports & Leisure',
    icon: '⚽',
    description: 'Sports equipment and leisure articles',
    regulations: ['PPE Regulation', 'CE', 'EN Standards'],
    subcategories: [
      'Bicycle', 'E-Bike', 'Mountain Bike', 'Road Bike',
      'Exercise Bike', 'Treadmill', 'Elliptical Trainer', 'Rowing Machine',
      'Dumbbells', 'Weights', 'Multi-Gym',
      'Football', 'Basketball', 'Volleyball', 'Tennis',
      'Golf', 'Golf Clubs', 'Golf Bag',
      'Ski Equipment', 'Skis', 'Ski Poles', 'Ski Boots',
      'Snowboard', 'Snowboard Binding',
      'Swimming Equipment', 'Swimming Goggles', 'Neoprene',
      'Camping', 'Tent', 'Sleeping Bag', 'Sleeping Pad',
      'Hiking Equipment', 'Hiking Boots', 'Trekking Poles',
      'Fishing', 'Fishing Rod', 'Reel', 'Lure',
      'Equestrian Sports', 'Saddle', 'Riding Helmet',
      'Sports PPE', 'Helmet', 'Protectors', 'Shin Guards',
    ],
  },
  {
    id: 'baby',
    name: 'Baby & Toddler',
    icon: '👶',
    description: 'Baby equipment and toddler products',
    regulations: ['Toy Safety Directive', 'EN 1888', 'ECE R44/R129', 'REACH'],
    subcategories: [
      'Strollers', 'Buggy', 'Combination Stroller', 'Double Stroller',
      'Car Seats', 'Infant Carrier', 'Child Seat Group 1', 'Child Seat Group 2/3',
      'Baby Cribs', 'Bassinet', 'Travel Crib', 'Bedside Crib',
      'High Chairs', 'Stair High Chair', 'Travel High Chair',
      'Baby Carriers', 'Baby Wrap', 'Baby Carrier', 'Child Carrier Backpack',
      'Nursing Accessories', 'Nursing Pillow', 'Breast Pump', 'Nursing Pads',
      'Baby Bottles', 'Nipples', 'Bottle Warmer', 'Sterilizer',
      'Diapers', 'Disposable Diapers', 'Cloth Diapers', 'Swim Diapers',
      'Baby Care', 'Changing Pad', 'Baby Bath', 'Care Products',
      'Baby Clothing', 'Onesies', 'Bodysuits', 'Sleep Sacks',
      'Playpens', 'Door Gates', 'Stair Gates',
      'Baby Monitor', 'Baby Camera', 'Sensor Mats',
    ],
  },
  {
    id: 'psa',
    name: 'PPE - Protective Equipment',
    icon: '🦺',
    description: 'Personal protective equipment',
    regulations: ['PPE Regulation (EU) 2016/425', 'CE', 'Category I-III'],
    subcategories: [
      'Head Protection', 'Safety Helmet', 'Bump Cap', 'Hair Protection',
      'Eye Protection', 'Safety Glasses', 'Full-Vision Goggles', 'Face Shield',
      'Hearing Protection', 'Ear Plugs', 'Ear Muffs', 'Banded Ear Plugs',
      'Respiratory Protection', 'FFP Masks', 'Half Masks', 'Full Face Masks', 'Powered Air Respirator',
      'Hand Protection', 'Work Gloves', 'Chemical Protection', 'Cut Protection',
      'Foot Protection', 'Safety Shoes S1-S3', 'Rubber Boots', 'Overshoes',
      'Body Protection', 'High-Visibility Vest', 'Welding Protection', 'Heat Protection',
      'Fall Protection', 'Safety Harness', 'Safety Rope', 'Height Safety',
      'Knee Protection', 'Knee Pads', 'Knee Mat',
      'Work Clothing', 'Work Trousers', 'Bib Overalls', 'Work Jacket',
      'Disposable Protection', 'Disposable Coverall', 'Disposable Gloves', 'Overshoes',
    ],
  },
  {
    id: 'renewable',
    name: 'Renewable Energy',
    icon: '☀️',
    description: 'Solar, wind and energy storage',
    regulations: ['CE', 'Low Voltage Directive', 'EMC', 'Ecodesign'],
    subcategories: [
      'Solar Modules', 'Monocrystalline', 'Polycrystalline', 'Thin Film',
      'Inverters', 'String Inverter', 'Hybrid Inverter', 'Micro Inverter',
      'Battery Storage', 'Lithium Storage', 'Lead Storage', 'Saltwater Storage',
      'Mounting Systems', 'On-Roof', 'In-Roof', 'Flat Roof', 'Ground-Mounted',
      'Balcony Power Station', 'Plug-In Solar', 'Mini PV',
      'Solar Thermal', 'Flat Plate Collectors', 'Evacuated Tube Collectors',
      'Small Wind Turbines', 'Vertical Axis', 'Horizontal Axis',
      'Energy Management', 'Smart Meter', 'Energy Monitor', 'Load Management',
      'Wallbox', 'AC Wallbox', 'DC Fast Charger', 'Mobile Charging Station',
      'Cables & Accessories', 'Solar Cable', 'Connectors', 'Surge Protection',
    ],
  },
];

export function ProductCategoriesPage() {
  const { t } = useTranslation('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [isLoading, setIsLoading] = useState(true);

  // Load categories from the API
  useEffect(() => {
    async function loadCategories() {
      try {
        const apiCategories = await getCategories();
        if (apiCategories.length > 0) {
          setCategories(apiCategories);
        }
      } catch (error) {
        console.warn('Could not load categories, using fallback data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, []);

  const filteredCategories = categories.filter(cat => {
    const searchLower = searchTerm.toLowerCase();
    const subcategories = cat.subcategories || [];
    return (
      cat.name.toLowerCase().includes(searchLower) ||
      (cat.description || '').toLowerCase().includes(searchLower) ||
      subcategories.some(sub => sub.toLowerCase().includes(searchLower))
    );
  });

  const totalSubcategories = categories.reduce((acc, cat) => acc + (cat.subcategories?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Product Categories')}</h1>
          <p className="text-muted-foreground">
            {t('{{count}} main categories with {{subCount}} subcategories', { count: categories.length, subCount: totalSubcategories })}
          </p>
        </div>
        <Link to="/requirements-calculator">
          <Button>
            <Zap className="mr-2 h-4 w-4" />
            {t('Requirements Calculator')}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('Search category or product...')}
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">{t('Main Categories')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Tag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSubcategories}</p>
                <p className="text-sm text-muted-foreground">{t('Subcategories')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">27+</p>
                <p className="text-sm text-muted-foreground">{t('EU Countries Covered')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">50+</p>
                <p className="text-sm text-muted-foreground">{t('Regulations')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Categories List */}
      {!isLoading && (
        <div className="grid gap-4">
          {filteredCategories.map((category) => {
            const regulations = category.regulations || [];
            const subcategories = category.subcategories || [];

            return (
              <Card key={category.id} className="overflow-hidden">
                <Accordion type="single" collapsible>
                  <AccordionItem value={category.id} className="border-none">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-4 text-left w-full">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-2xl">
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{category.name}</h3>
                            <Badge variant="secondary">{subcategories.length} {t('Products')}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        </div>
                        <div className="hidden md:flex flex-wrap gap-1 max-w-xs justify-end">
                          {regulations.slice(0, 3).map(reg => (
                            <Badge key={reg} variant="outline" className="text-xs">
                              {reg}
                            </Badge>
                          ))}
                          {regulations.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{regulations.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="space-y-4">
                        {/* Regulations */}
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            {t('Relevant Regulations')}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {regulations.map(reg => (
                              <Badge key={reg} variant="default">
                                {reg}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Subcategories */}
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {t('Product Types')} ({subcategories.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {subcategories.map(sub => (
                              <Badge key={sub} variant="secondary" className="text-xs">
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Link to={`/requirements-calculator?category=${category.id}`}>
                            <Button size="sm">
                              <Zap className="mr-2 h-4 w-4" />
                              {t('Check Requirements')}
                            </Button>
                          </Link>
                          <Link to={`/checklists?category=${category.id}`}>
                            <Button size="sm" variant="outline">
                              <FileText className="mr-2 h-4 w-4" />
                              {t('Open Checklist')}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filteredCategories.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t('No categories found')}</h3>
            <p className="text-muted-foreground">{t('Try a different search term')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
