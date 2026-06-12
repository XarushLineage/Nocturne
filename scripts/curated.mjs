/**
 * Curated registry of art periods and artists.
 *
 * This file is the ONLY hand-written part of the dataset. Everything else
 * (biographies, portraits, artwork lists, artwork images, descriptions,
 * dates, mediums, collections) is fetched from Wikipedia / Wikidata /
 * Wikimedia Commons by scripts/fetchWikiData.mjs and written to src/data/.
 *
 * To expand the museum later: add a period or an artist here (the
 * `wikiTitle` must be the exact English Wikipedia article title), then run
 *   npm run fetch-data
 *
 * `significance` lines are short editorial summaries of facts stated in the
 * lead of each artist's Wikipedia article (linked as the source in the UI).
 * `lane` is a vertical stagger offset (in world units) used by the
 * constellation layout so periods that overlap in time do not collide.
 */

export const periods = [
  { id: 'medieval-gothic', name: 'Medieval & Gothic', start: 1200, end: 1400, lane: 0, wikiTitle: 'Gothic art', summary: 'Sacred art of the late Middle Ages — gold grounds, altarpieces, and the first steps toward naturalism.' },
  { id: 'early-renaissance', name: 'Early Renaissance', start: 1400, end: 1495, lane: -40, wikiTitle: 'Italian Renaissance painting', summary: 'Florence rediscovers perspective, anatomy, and antiquity.' },
  { id: 'northern-renaissance', name: 'Northern Renaissance', start: 1430, end: 1580, lane: 55, wikiTitle: 'Northern Renaissance', summary: 'Oil paint, minute realism, and print culture north of the Alps.' },
  { id: 'italian-renaissance', name: 'Italian Renaissance', start: 1495, end: 1530, lane: -5, wikiTitle: 'High Renaissance', summary: 'Leonardo, Michelangelo, and Raphael define the classical ideal.' },
  { id: 'mannerism', name: 'Mannerism', start: 1520, end: 1600, lane: -60, wikiTitle: 'Mannerism', summary: 'Elegant, artificial, and strange — art after Raphael’s perfection.' },
  { id: 'baroque', name: 'Baroque', start: 1600, end: 1720, lane: 5, wikiTitle: 'Baroque painting', summary: 'Drama, chiaroscuro, and movement in the age of courts and counter-reformation.' },
  { id: 'rococo', name: 'Rococo', start: 1720, end: 1780, lane: 60, wikiTitle: 'Rococo', summary: 'Lightness, pleasure, and ornament in eighteenth-century France.' },
  { id: 'neoclassicism', name: 'Neoclassicism', start: 1760, end: 1830, lane: -50, wikiTitle: 'Neoclassicism', summary: 'A return to antique order, line, and civic virtue.' },
  { id: 'romanticism', name: 'Romanticism', start: 1790, end: 1850, lane: 30, wikiTitle: 'Romanticism', summary: 'Emotion, the sublime, and the individual against the storm.' },
  { id: 'realism', name: 'Realism', start: 1840, end: 1880, lane: -15, wikiTitle: 'Realism (art movement)', summary: 'Ordinary life painted without idealization.' },
  { id: 'impressionism', name: 'Impressionism', start: 1865, end: 1895, lane: 75, wikiTitle: 'Impressionism', summary: 'Open-air painting of fleeting light and modern leisure.' },
  { id: 'symbolism', name: 'Symbolism', start: 1880, end: 1910, lane: -75, wikiTitle: 'Symbolism (arts)', summary: 'Dreams, myth, and the inner world against materialism.' },
  { id: 'post-impressionism', name: 'Post-Impressionism', start: 1886, end: 1910, lane: 20, wikiTitle: 'Post-Impressionism', summary: 'Structure, symbol, and expressive color after Impressionism.' },
  { id: 'expressionism', name: 'Expressionism', start: 1905, end: 1933, lane: 110, wikiTitle: 'Expressionism', summary: 'Inner feeling distorts color and form.' },
  { id: 'cubism', name: 'Cubism', start: 1907, end: 1922, lane: -45, wikiTitle: 'Cubism', summary: 'Objects shattered into facets and reassembled.' },
  { id: 'surrealism', name: 'Surrealism', start: 1924, end: 1955, lane: 45, wikiTitle: 'Surrealism', summary: 'The unconscious made visible.' },
  { id: 'abstract-expressionism', name: 'Abstract Expressionism', start: 1943, end: 1965, lane: -120, wikiTitle: 'Abstract expressionism', summary: 'New York’s gestural and color-field abstraction after the war.' },
  { id: 'pop-art', name: 'Pop Art', start: 1955, end: 1975, lane: -15, wikiTitle: 'Pop art', summary: 'Mass media and consumer culture enter the museum.' },
  { id: 'contemporary', name: 'Contemporary Art', start: 1975, end: 2026, lane: -60, wikiTitle: 'Contemporary art', summary: 'Global, plural, and conceptual — art since the late twentieth century.' },
];

export const artists = [
  // ——— Medieval & Gothic ———
  { id: 'giotto', name: 'Giotto', wikiTitle: 'Giotto', periodId: 'medieval-gothic', born: 1267, died: 1337, significance: 'Broke from Byzantine convention toward naturalism; his Scrovegni Chapel frescoes prefigured the Renaissance.' },
  { id: 'cimabue', name: 'Cimabue', wikiTitle: 'Cimabue', periodId: 'medieval-gothic', born: 1240, died: 1302, significance: 'Among the last great painters in the Byzantine manner and an early mover toward naturalism; traditionally Giotto’s teacher.' },
  { id: 'duccio', name: 'Duccio', wikiTitle: 'Duccio', periodId: 'medieval-gothic', born: 1255, died: 1319, significance: 'Founder of the Sienese school; his Maestà altarpiece is a landmark of late medieval painting.' },

  // ——— Early Renaissance ———
  { id: 'masaccio', name: 'Masaccio', wikiTitle: 'Masaccio', periodId: 'early-renaissance', born: 1401, died: 1428, significance: 'First great painter of the Quattrocento; pioneered linear perspective and naturalistic light in fresco.' },
  { id: 'fra-angelico', name: 'Fra Angelico', wikiTitle: 'Fra Angelico', periodId: 'early-renaissance', born: 1395, died: 1455, significance: 'Dominican friar whose San Marco frescoes united Gothic piety with Renaissance clarity.' },
  { id: 'piero-della-francesca', name: 'Piero della Francesca', wikiTitle: 'Piero della Francesca', periodId: 'early-renaissance', born: 1415, died: 1492, significance: 'Mathematician-painter of serene geometry and cool, even light.' },
  { id: 'botticelli', name: 'Sandro Botticelli', wikiTitle: 'Sandro Botticelli', periodId: 'early-renaissance', born: 1445, died: 1510, significance: 'Florentine master of mythological grace — The Birth of Venus and Primavera.' },

  // ——— Italian (High) Renaissance ———
  { id: 'leonardo', name: 'Leonardo da Vinci', wikiTitle: 'Leonardo da Vinci', periodId: 'italian-renaissance', born: 1452, died: 1519, significance: 'Archetypal Renaissance polymath; the Mona Lisa and The Last Supper are among the most famous images ever made.' },
  { id: 'michelangelo', name: 'Michelangelo', wikiTitle: 'Michelangelo', periodId: 'italian-renaissance', born: 1475, died: 1564, significance: 'Sculptor, painter, and architect; the Sistine Chapel ceiling redefined what painting could be.' },
  { id: 'raphael', name: 'Raphael', wikiTitle: 'Raphael', periodId: 'italian-renaissance', born: 1483, died: 1520, significance: 'Master of clarity, harmony, and grace; The School of Athens crowns High Renaissance ideals.' },
  { id: 'titian', name: 'Titian', wikiTitle: 'Titian', periodId: 'italian-renaissance', born: 1488, died: 1576, significance: 'Leader of Venetian painting; his command of color shaped centuries of European art.' },

  // ——— Northern Renaissance ———
  { id: 'van-eyck', name: 'Jan van Eyck', wikiTitle: 'Jan van Eyck', periodId: 'northern-renaissance', born: 1390, died: 1441, significance: 'Perfected early oil technique; the Arnolfini Portrait and Ghent Altarpiece set a new bar for realism.' },
  { id: 'durer', name: 'Albrecht Dürer', wikiTitle: 'Albrecht Dürer', periodId: 'northern-renaissance', born: 1471, died: 1528, significance: 'Brought Renaissance theory north of the Alps; the greatest printmaker of his age.' },
  { id: 'bosch', name: 'Hieronymus Bosch', wikiTitle: 'Hieronymus Bosch', periodId: 'northern-renaissance', born: 1450, died: 1516, significance: 'Visionary of fantastical moral landscapes — The Garden of Earthly Delights.' },
  { id: 'bruegel', name: 'Pieter Bruegel the Elder', wikiTitle: 'Pieter Bruegel the Elder', periodId: 'northern-renaissance', born: 1525, died: 1569, significance: 'Elevated peasant life and landscape into major subjects of painting.' },

  // ——— Mannerism ———
  { id: 'el-greco', name: 'El Greco', wikiTitle: 'El Greco', periodId: 'mannerism', born: 1541, died: 1614, significance: 'Fused Byzantine roots with Venetian color into ecstatic, elongated figures centuries ahead of their time.' },
  { id: 'parmigianino', name: 'Parmigianino', wikiTitle: 'Parmigianino', periodId: 'mannerism', born: 1503, died: 1540, significance: 'Epitome of Mannerist elegance — Madonna with the Long Neck.' },
  { id: 'bronzino', name: 'Bronzino', wikiTitle: 'Bronzino', periodId: 'mannerism', born: 1503, died: 1572, significance: 'Cold, polished court portraitist of Medici Florence.' },

  // ——— Baroque ———
  { id: 'caravaggio', name: 'Caravaggio', wikiTitle: 'Caravaggio', periodId: 'baroque', born: 1571, died: 1610, significance: 'Revolutionized painting with raw naturalism and theatrical chiaroscuro.' },
  { id: 'rubens', name: 'Peter Paul Rubens', wikiTitle: 'Peter Paul Rubens', periodId: 'baroque', born: 1577, died: 1640, significance: 'Engine of the Flemish Baroque; dynamic, sensuous compositions on a grand scale.' },
  { id: 'gentileschi', name: 'Artemisia Gentileschi', wikiTitle: 'Artemisia Gentileschi', periodId: 'baroque', born: 1593, died: 1656, significance: 'The most accomplished woman painter of the Italian Baroque; her Judith canvases remain startlingly powerful.' },
  { id: 'velazquez', name: 'Diego Velázquez', wikiTitle: 'Diego Velázquez', periodId: 'baroque', born: 1599, died: 1660, significance: 'Court painter of Spain; Las Meninas remains painting’s great enigma.' },
  { id: 'rembrandt', name: 'Rembrandt', wikiTitle: 'Rembrandt', periodId: 'baroque', born: 1606, died: 1669, significance: 'Supreme Dutch master of light, shadow, and human depth.' },
  { id: 'vermeer', name: 'Johannes Vermeer', wikiTitle: 'Johannes Vermeer', periodId: 'baroque', born: 1632, died: 1675, significance: 'Quiet poet of Delft interiors and daylight; only about three dozen paintings survive.' },

  // ——— Rococo ———
  { id: 'watteau', name: 'Antoine Watteau', wikiTitle: 'Antoine Watteau', periodId: 'rococo', born: 1684, died: 1721, significance: 'Invented the fête galante — theatrical, bittersweet scenes of leisure.' },
  { id: 'boucher', name: 'François Boucher', wikiTitle: 'François Boucher', periodId: 'rococo', born: 1703, died: 1770, significance: 'Defined the decorative exuberance of Louis XV’s France.' },
  { id: 'fragonard', name: 'Jean-Honoré Fragonard', wikiTitle: 'Jean-Honoré Fragonard', periodId: 'rococo', born: 1732, died: 1806, significance: 'Virtuoso of Rococo playfulness — The Swing.' },

  // ——— Neoclassicism ———
  { id: 'david', name: 'Jacques-Louis David', wikiTitle: 'Jacques-Louis David', periodId: 'neoclassicism', born: 1748, died: 1825, significance: 'Severe moral classicism that became the visual language of the French Revolution.' },
  { id: 'ingres', name: 'Jean-Auguste-Dominique Ingres', wikiTitle: 'Jean-Auguste-Dominique Ingres', periodId: 'neoclassicism', born: 1780, died: 1867, significance: 'Champion of line against Romantic color; flawless portraits and odalisques.' },
  { id: 'kauffman', name: 'Angelica Kauffman', wikiTitle: 'Angelica Kauffman', periodId: 'neoclassicism', born: 1741, died: 1807, significance: 'Swiss Neoclassical history painter; a founding member of London’s Royal Academy.' },

  // ——— Romanticism ———
  { id: 'goya', name: 'Francisco Goya', wikiTitle: 'Francisco Goya', periodId: 'romanticism', born: 1746, died: 1828, significance: 'From court painter to dark visionary; a bridge between the old masters and modernity.' },
  { id: 'turner', name: 'J. M. W. Turner', wikiTitle: 'J. M. W. Turner', periodId: 'romanticism', born: 1775, died: 1851, significance: 'Dissolved landscape into light and storm; a precursor of Impressionism and abstraction.' },
  { id: 'friedrich', name: 'Caspar David Friedrich', wikiTitle: 'Caspar David Friedrich', periodId: 'romanticism', born: 1774, died: 1840, significance: 'German Romantic of solitary figures before sublime nature.' },
  { id: 'delacroix', name: 'Eugène Delacroix', wikiTitle: 'Eugène Delacroix', periodId: 'romanticism', born: 1798, died: 1863, significance: 'Standard-bearer of French Romanticism — Liberty Leading the People.' },

  // ——— Realism ———
  { id: 'courbet', name: 'Gustave Courbet', wikiTitle: 'Gustave Courbet', periodId: 'realism', born: 1819, died: 1877, significance: 'Led the Realist movement, painting ordinary life at the scale once reserved for history.' },
  { id: 'millet', name: 'Jean-François Millet', wikiTitle: 'Jean-François Millet', periodId: 'realism', born: 1814, died: 1875, significance: 'Dignified the rural laborer — The Gleaners, The Angelus.' },
  { id: 'daumier', name: 'Honoré Daumier', wikiTitle: 'Honoré Daumier', periodId: 'realism', born: 1808, died: 1879, significance: 'Satirist of bourgeois France in lithograph and paint.' },

  // ——— Impressionism ———
  { id: 'monet', name: 'Claude Monet', wikiTitle: 'Claude Monet', periodId: 'impressionism', born: 1840, died: 1926, significance: 'Founder of Impressionism; pursued light in series, from haystacks to water lilies.' },
  { id: 'renoir', name: 'Pierre-Auguste Renoir', wikiTitle: 'Pierre-Auguste Renoir', periodId: 'impressionism', born: 1841, died: 1919, significance: 'Painter of radiant figures and the pleasures of modern life.' },
  { id: 'degas', name: 'Edgar Degas', wikiTitle: 'Edgar Degas', periodId: 'impressionism', born: 1834, died: 1917, significance: 'Draughtsman of dancers, racecourses, and modern movement.' },
  { id: 'morisot', name: 'Berthe Morisot', wikiTitle: 'Berthe Morisot', periodId: 'impressionism', born: 1841, died: 1895, significance: 'Core member of the Impressionist circle; luminous domestic scenes.' },
  { id: 'pissarro', name: 'Camille Pissarro', wikiTitle: 'Camille Pissarro', periodId: 'impressionism', born: 1830, died: 1903, significance: 'Patriarch of Impressionism; the only painter shown in all eight Impressionist exhibitions.' },
  { id: 'cassatt', name: 'Mary Cassatt', wikiTitle: 'Mary Cassatt', periodId: 'impressionism', born: 1844, died: 1926, significance: 'American in Paris; modern, unsentimental images of women and children.' },

  // ——— Post-Impressionism ———
  { id: 'van-gogh', name: 'Vincent van Gogh', wikiTitle: 'Vincent van Gogh', periodId: 'post-impressionism', born: 1853, died: 1890, significance: 'Expressive color and impasto that changed painting; his famous works were made in a single final decade.' },
  { id: 'cezanne', name: 'Paul Cézanne', wikiTitle: 'Paul Cézanne', periodId: 'post-impressionism', born: 1839, died: 1906, significance: 'Rebuilt nature from planes of color; a foundation for Cubism and modern art.' },
  { id: 'gauguin', name: 'Paul Gauguin', wikiTitle: 'Paul Gauguin', periodId: 'post-impressionism', born: 1848, died: 1903, significance: 'Symbolist color and Tahitian subjects that pushed painting beyond naturalism.' },
  { id: 'seurat', name: 'Georges Seurat', wikiTitle: 'Georges Seurat', periodId: 'post-impressionism', born: 1859, died: 1891, significance: 'Invented pointillism — A Sunday Afternoon on the Island of La Grande Jatte.' },
  { id: 'toulouse-lautrec', name: 'Henri de Toulouse-Lautrec', wikiTitle: 'Henri de Toulouse-Lautrec', periodId: 'post-impressionism', born: 1864, died: 1901, significance: 'Chronicler of Montmartre nightlife; elevated the poster to art.' },

  // ——— Symbolism ———
  { id: 'moreau', name: 'Gustave Moreau', wikiTitle: 'Gustave Moreau', periodId: 'symbolism', born: 1826, died: 1898, significance: 'Jeweled mythologies that fed the Symbolist imagination.' },
  { id: 'redon', name: 'Odilon Redon', wikiTitle: 'Odilon Redon', periodId: 'symbolism', born: 1840, died: 1916, significance: 'Visionary charcoal noirs and radiant late pastels of dream subjects.' },
  { id: 'bocklin', name: 'Arnold Böcklin', wikiTitle: 'Arnold Böcklin', periodId: 'symbolism', born: 1827, died: 1901, significance: 'Isle of the Dead — mythic landscapes of mortality.' },

  // ——— Expressionism ———
  { id: 'munch', name: 'Edvard Munch', wikiTitle: 'Edvard Munch', periodId: 'expressionism', born: 1863, died: 1944, significance: 'The Scream; anxiety and memory made into modern subject matter.' },
  { id: 'schiele', name: 'Egon Schiele', wikiTitle: 'Egon Schiele', periodId: 'expressionism', born: 1890, died: 1918, significance: 'Raw, contorted figures; Klimt’s protégé, dead at twenty-eight.' },
  { id: 'kirchner', name: 'Ernst Ludwig Kirchner', wikiTitle: 'Ernst Ludwig Kirchner', periodId: 'expressionism', born: 1880, died: 1938, significance: 'Founder of Die Brücke; jagged street scenes of Berlin.' },
  { id: 'kandinsky', name: 'Wassily Kandinsky', wikiTitle: 'Wassily Kandinsky', periodId: 'expressionism', born: 1866, died: 1944, significance: 'Pioneer of abstract painting; sought a music of pure color and form.' },

  // ——— Cubism ———
  { id: 'picasso', name: 'Pablo Picasso', wikiTitle: 'Pablo Picasso', periodId: 'cubism', born: 1881, died: 1973, significance: 'Co-founder of Cubism and the most protean artist of the twentieth century.' },
  { id: 'braque', name: 'Georges Braque', wikiTitle: 'Georges Braque', periodId: 'cubism', born: 1882, died: 1963, significance: 'Co-invented Cubism with Picasso; a lifelong investigation of still life.' },
  { id: 'gris', name: 'Juan Gris', wikiTitle: 'Juan Gris', periodId: 'cubism', born: 1887, died: 1927, significance: 'Clarified Cubism into crystalline, designed harmony.' },

  // ——— Surrealism ———
  { id: 'dali', name: 'Salvador Dalí', wikiTitle: 'Salvador Dalí', periodId: 'surrealism', born: 1904, died: 1989, significance: 'Hand-painted dream photographs — The Persistence of Memory.' },
  { id: 'magritte', name: 'René Magritte', wikiTitle: 'René Magritte', periodId: 'surrealism', born: 1898, died: 1967, significance: 'Deadpan paradoxes that question images themselves.' },
  { id: 'ernst', name: 'Max Ernst', wikiTitle: 'Max Ernst', periodId: 'surrealism', born: 1891, died: 1976, significance: 'Restless inventor of collage, frottage, and Surrealist technique.' },
  { id: 'carrington', name: 'Leonora Carrington', wikiTitle: 'Leonora Carrington', periodId: 'surrealism', born: 1917, died: 2011, significance: 'British-Mexican Surrealist of alchemical, feminist mythologies.' },
  { id: 'varo', name: 'Remedios Varo', wikiTitle: 'Remedios Varo', periodId: 'surrealism', born: 1908, died: 1963, significance: 'Spanish-Mexican painter of meticulous mystical machines.' },

  // ——— Abstract Expressionism ———
  { id: 'pollock', name: 'Jackson Pollock', wikiTitle: 'Jackson Pollock', periodId: 'abstract-expressionism', born: 1912, died: 1956, significance: 'Drip paintings that put American art at the center of the avant-garde.' },
  { id: 'rothko', name: 'Mark Rothko', wikiTitle: 'Mark Rothko', periodId: 'abstract-expressionism', born: 1903, died: 1970, significance: 'Floating fields of color meant to overwhelm and console.' },
  { id: 'de-kooning', name: 'Willem de Kooning', wikiTitle: 'Willem de Kooning', periodId: 'abstract-expressionism', born: 1904, died: 1997, significance: 'Gestural figuration — the Woman series — at the heart of action painting.' },
  { id: 'krasner', name: 'Lee Krasner', wikiTitle: 'Lee Krasner', periodId: 'abstract-expressionism', born: 1908, died: 1984, significance: 'Rigorous abstractionist; a founding Abstract Expressionist long overshadowed by Pollock.' },

  // ——— Pop Art ———
  { id: 'warhol', name: 'Andy Warhol', wikiTitle: 'Andy Warhol', periodId: 'pop-art', born: 1928, died: 1987, significance: 'Soup cans, Marilyns, and the Factory; art in the age of mass media.' },
  { id: 'lichtenstein', name: 'Roy Lichtenstein', wikiTitle: 'Roy Lichtenstein', periodId: 'pop-art', born: 1923, died: 1997, significance: 'Comic-strip Ben-Day dots scaled to museum walls.' },
  { id: 'hamilton', name: 'Richard Hamilton', wikiTitle: 'Richard Hamilton (artist)', periodId: 'pop-art', born: 1922, died: 2011, significance: 'British pioneer of Pop; his 1956 collage is often called the first work of Pop art.' },
  { id: 'rosenquist', name: 'James Rosenquist', wikiTitle: 'James Rosenquist', periodId: 'pop-art', born: 1933, died: 2017, significance: 'Billboard-scale fragments of American consumer life.' },

  // ——— Contemporary ———
  { id: 'kusama', name: 'Yayoi Kusama', wikiTitle: 'Yayoi Kusama', periodId: 'contemporary', born: 1929, died: null, significance: 'Polka dots and Infinity Mirror Rooms; among the most visited artists alive.' },
  { id: 'richter', name: 'Gerhard Richter', wikiTitle: 'Gerhard Richter', periodId: 'contemporary', born: 1932, died: null, significance: 'Moves between photorealism and squeegee abstraction; postwar Germany’s leading painter.' },
  { id: 'ai-weiwei', name: 'Ai Weiwei', wikiTitle: 'Ai Weiwei', periodId: 'contemporary', born: 1957, died: null, significance: 'Conceptual artist and activist; Sunflower Seeds at Tate Modern.' },
];
