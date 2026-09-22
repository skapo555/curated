/* Curated — mock editorial data.
   Everything here is original placeholder content. Publication names are used
   as believable source labels only; no real article bodies are reproduced. */

const NOW = Date.now();
const H = 3600 * 1000;
const ago = (hours) => new Date(NOW - hours * H).toISOString();

export const TOPICS = [
  { id: 'australia',   name: 'Australia',     blurb: 'Politics, policy and life at home.' },
  { id: 'economics',   name: 'Economics',     blurb: 'Markets, money and the real economy.' },
  { id: 'geopolitics', name: 'Geopolitics',   blurb: 'Power, alliances and the Indo-Pacific.' },
  { id: 'defence',     name: 'Defence',       blurb: 'Strategy, capability and security.' },
  { id: 'technology',  name: 'Technology',    blurb: 'Platforms, chips and what they change.' },
  { id: 'science',     name: 'Science',       blurb: 'Energy, climate and discovery.' },
  { id: 'policy',      name: 'Policy',        blurb: 'How the machinery of government works.' },
];

/* type: publication | blog | youtube | website | research */
export const SOURCES = [
  { id: 'afr',        name: 'Australian Financial Review', short: 'AFR', type: 'publication', tagline: 'Business, finance and politics from Sydney.', followed: true },
  { id: 'interpreter',name: 'The Interpreter',             type: 'research',    tagline: 'Lowy Institute analysis on Australia in the world.', followed: true },
  { id: 'perun',      name: 'Perun',                       type: 'youtube',     tagline: 'Long-form defence economics, one PowerPoint at a time.', followed: true },
  { id: 'economist',  name: 'The Economist',               type: 'publication', tagline: 'International affairs, business and ideas.', followed: true },
  { id: 'abc',        name: 'ABC News',                    type: 'publication', tagline: 'Australia’s public broadcaster.', followed: true },
  { id: 'stratechery',name: 'Stratechery',                 type: 'blog',        tagline: 'Ben Thompson on the strategy of technology.', followed: true },
  { id: 'conversation',name: 'The Conversation',           type: 'website',     tagline: 'Academic experts writing for a general audience.', followed: true },
  { id: 'foreignaffairs', name: 'Foreign Affairs',         type: 'publication', tagline: 'Essays on international relations and grand strategy.', followed: true },
  { id: 'strategist', name: 'The Strategist',              type: 'research',    tagline: 'ASPI’s commentary on defence and security.', followed: true },
  { id: 'caspian',    name: 'Caspian Report',              type: 'youtube',     tagline: 'Geopolitics explained through history and geography.', followed: true },
  { id: 'grattan',    name: 'Grattan Institute',           type: 'research',    tagline: 'Independent Australian public policy research.', followed: true },
  { id: 'ft',         name: 'Financial Times',             type: 'publication', tagline: 'Global business and markets.', followed: true },
  { id: 'noahpinion', name: 'Noahpinion',                  type: 'blog',        tagline: 'Noah Smith on economics and the future.', followed: true },
  { id: 'wendover',   name: 'Wendover Productions',        type: 'youtube',     tagline: 'How the world’s logistics actually work.', followed: true },
  { id: 'guardianau', name: 'Guardian Australia',          type: 'publication', tagline: 'News and long reads with an Australian lens.', followed: true },
  { id: 'mr',         name: 'Marginal Revolution',         type: 'blog',        tagline: 'Tyler Cowen and Alex Tabarrok, daily.', followed: true },
  { id: 'quanta',     name: 'Quanta Magazine',             type: 'publication', tagline: 'Illuminating science and mathematics.', followed: true },
  // Discoverable, not followed
  { id: 'bloomberg',  name: 'Bloomberg',                   type: 'publication', tagline: 'Markets, business and economics.', followed: false },
  { id: 'atlantic',   name: 'The Atlantic',                type: 'publication', tagline: 'Ideas, culture and politics.', followed: false },
  { id: 'saturday',   name: 'The Saturday Paper',          type: 'publication', tagline: 'Weekly long-form Australian journalism.', followed: false },
  { id: 'monthly',    name: 'The Monthly',                 type: 'publication', tagline: 'Australian politics, society and culture.', followed: false },
  { id: 'insidestory',name: 'Inside Story',                type: 'website',     tagline: 'Current affairs and culture from Australia.', followed: false },
  { id: 'sinocism',   name: 'Sinocism',                    type: 'blog',        tagline: 'Bill Bishop’s newsletter on China.', followed: false },
  { id: 'diplomat',   name: 'The Diplomat',                type: 'publication', tagline: 'Asia-Pacific current affairs.', followed: false },
  { id: 'wotr',       name: 'War on the Rocks',            type: 'website',     tagline: 'National security analysis and commentary.', followed: false },
  { id: 'moneystuff', name: 'Money Stuff',                 type: 'blog',        tagline: 'Matt Levine on finance, daily.', followed: false },
  { id: 'kurzgesagt', name: 'Kurzgesagt',                  type: 'youtube',     tagline: 'Animated explainers on science and society.', followed: false },
  { id: 'tldr',       name: 'TLDR News',                   type: 'youtube',     tagline: 'Concise explainers on politics and current affairs.', followed: false },
  { id: 'nikkei',     name: 'Nikkei Asia',                 type: 'publication', tagline: 'Business and politics across Asia.', followed: false },
  { id: 'asiasociety',name: 'Asia Society Australia',      type: 'research',    tagline: 'Australia’s engagement with Asia.', followed: false },
  { id: 'crikey',     name: 'Crikey',                      type: 'publication', tagline: 'Independent Australian news and commentary.', followed: false },
];

export const SOURCE_TYPE_LABEL = {
  publication: 'Publication', blog: 'Blog', youtube: 'YouTube channel', website: 'Website', research: 'Research',
};

/* ---------- Article bodies (original placeholder prose) ---------- */

const P = (text) => ({ t: 'p', text });
const H2 = (text) => ({ t: 'h2', text });
const Q = (text) => ({ t: 'quote', text });

const BODY_LONG_PEACE = [
  P('For most of the past eighty years, the absence of war between great powers has been treated as an achievement to be maintained. It is more accurate to call it a condition to be understood. The Long Peace was not designed. It emerged from a particular arrangement of technology, economics and exhaustion, and each of those foundations is now shifting at once.'),
  P('The conventional story credits institutions: the United Nations, the alliance system, the slow accretion of trade rules. Institutions mattered, but they were the scaffolding, not the load-bearing wall. What held the structure up was a set of circumstances that made large wars look unprofitable to the people who could start them. Nuclear weapons made escalation unthinkable; industrial integration made disruption expensive; and the memory of 1945 made political leaders cautious in ways their successors are not.'),
  H2('Three foundations, all moving'),
  P('Consider the nuclear foundation first. Deterrence worked in a world of two large arsenals and a handful of small ones. It is far less certain in a world of three large arsenals, several regional ones, and delivery systems fast enough to compress decision time to minutes. The logic has not broken, but the margin for error has narrowed, and the number of people who must not make an error has grown.'),
  P('The economic foundation is shifting more visibly. Integration once meant that a conflict in one region would impose costs everywhere, and those costs disciplined behaviour. Governments now speak the language of resilience and friend-shoring, which is another way of saying they are deliberately reducing the costs that war would impose on themselves. Each step is individually reasonable. Collectively, they dismantle a restraint that nobody voted to remove.'),
  P('The third foundation is generational, and it is the one least discussed in policy circles because it is the hardest to measure. The people who negotiated the post-war order had seen what total war did to cities. Their successors have seen wars, but not that war. The difference is not moral; it is experiential, and it shapes what leaders believe is possible.'),
  Q('Peace that is not planned cannot be assumed to persist simply because it has persisted.'),
  H2('What middle powers can do'),
  P('For a country like Australia, the implications are uncomfortable. Middle powers benefited from the Long Peace more than anyone, because it allowed them to trade without choosing sides and to defer hard questions about self-reliance. A more contested world does not remove those benefits overnight, but it makes them conditional.'),
  P('The sensible response is not alarm but honesty. Alliances should be valued for what they are: agreements between governments with their own interests, not guarantees. Economic exposure should be mapped rather than wished away. And the domestic conversation about defence should move beyond procurement announcements to the harder question of what a country is actually prepared to do, and with whom.'),
  P('None of this means that war is likely. It means that peace is no longer a background condition. That is a different way of thinking about the world, and adjusting to it will take longer than any single budget cycle.'),
];

const BODY_RBA = [
  P('The Reserve Bank has spent much of this year saying the same thing in slightly different ways: inflation is heading in the right direction, the labour market is loosening but not collapsing, and the board will wait for the data. Markets have read this as a countdown to the next cut. A closer reading of the last three statements suggests something else is going on.'),
  P('The language has changed in small but telling ways. References to the "narrow path" have quietly disappeared. The board now talks about "the balance of risks", which is central-bank shorthand for uncertainty in both directions. And the discussion of productivity, once a footnote, has moved into the main text.'),
  H2('The productivity problem'),
  P('Productivity matters to the bank because it determines how much wage growth the economy can absorb without prices rising. If output per hour is stagnant, then wage increases of four per cent feed almost directly into costs. The bank’s own forecasts assume a recovery in productivity that has not yet appeared, and several board members have begun to say so publicly.'),
  P('If that recovery does not arrive, the neutral rate, the level at which policy is neither stimulating nor restraining the economy, is higher than the market assumes. A cash rate that looks restrictive today may turn out to be close to neutral. That is the quiet pivot: not a change in the board’s stated intentions, but a change in the framework it uses to judge them.'),
  Q('The next move may not be a cut. It may be a long pause that the market has not priced.'),
  H2('What this means for households'),
  P('For mortgage holders, the practical implication is that relief may be slower to arrive than lenders have been suggesting. Fixed-rate offers have been drifting lower on the assumption of cuts; some of that pricing may reverse. For savers, the opposite holds.'),
  P('For the government, the timing is awkward. Fiscal policy has been mildly expansionary, and the bank has been careful not to say so directly. A prolonged pause would put that politeness under strain.'),
  P('None of this is certain. The board could still cut if unemployment rises faster than expected. But the assumption that the only question is when, not whether, deserves more scrutiny than it has been getting.'),
];

const BODY_JAKARTA = [
  P('Australian policy toward Indonesia has a recurring shape. A new government arrives in Canberra, announces that the relationship is a priority, sends a minister to Jakarta early, and then spends the rest of its term reacting to events elsewhere. The pattern is not the result of bad faith. It is the product of a mismatch between how the two countries understand each other’s importance.'),
  P('From Canberra, Indonesia is a large, close and occasionally puzzling neighbour whose stability is essential and whose politics are hard to read. From Jakarta, Australia is a wealthy, distant and occasionally puzzling neighbour whose anxieties are hard to take seriously. Both descriptions are fair. Neither is a basis for strategy.'),
  H2('The three assumptions'),
  P('Three assumptions underpin most Australian commentary. The first is that Indonesia wants a closer relationship and simply needs encouragement. The second is that trade will follow diplomacy. The third is that defence cooperation can be insulated from politics. Each is partly true, and each leads policy astray when treated as wholly true.'),
  P('Indonesia does want a good relationship, but on its own terms, which prioritise non-alignment and regional leadership. Trade has grown, but slowly, and mostly in commodities rather than the services and investment that both governments say they want. Defence cooperation has deepened, but it remains hostage to the next incident, and there is always a next incident.'),
  Q('Jakarta does not need to be persuaded that Australia matters. It needs to be persuaded that Australia will still be paying attention in three years.'),
  H2('A different approach'),
  P('The most useful thing Australia could do is boring: sustain attention through the political cycle. That means funding language programs that survive budget reviews, keeping senior officials in post long enough to build relationships, and resisting the temptation to announce initiatives that will not be resourced.'),
  P('It also means listening to what Indonesian policymakers actually say about their priorities, which are domestic and economic first, and strategic second. A relationship built around Australia’s strategic anxieties will always feel one-sided in Jakarta. One built around shared economic interests has a chance of lasting.'),
];

const BODY_AGGREGATOR = [
  P('Nearly a decade ago I argued that the defining companies of the internet era were aggregators: businesses that owned the customer relationship, commoditised suppliers, and grew stronger with every new user. The framework held up well. It is now worth asking where it breaks.'),
  P('The most interesting stress comes not from regulation, which has been slower and weaker than expected, but from a change in what users want. Aggregation works when the job to be done is finding something. It works less well when the job is understanding something, because understanding requires trust, and trust does not scale the way search does.'),
  H2('When discovery stops being the bottleneck'),
  P('For most of the web’s history, discovery was the scarce resource. There was more content than anyone could find, so whoever controlled finding controlled everything. Generative models change the economics of content creation so thoroughly that discovery is no longer the bottleneck; judgement is. And judgement, unlike discovery, is something users are willing to pay for and reluctant to outsource.'),
  P('This creates an opening for a different kind of business: one that deliberately limits supply rather than aggregating it. Think of the difference between a search engine and a good editor. The editor’s value lies precisely in what they leave out.'),
  Q('Aggregators win by having everything. The next generation may win by having less.'),
  H2('The dilemma'),
  P('The dilemma for incumbents is that their entire cost structure is built around scale. Curation is expensive per user in a way that indexing is not. Any move toward it dilutes the economics that made them dominant. They will experiment at the margins, but they cannot become editors without becoming smaller, and no public company chooses to become smaller.'),
  P('That leaves room for new entrants. The question is whether users will actually change behaviour, or whether the convenience of aggregation will continue to beat the quality of curation, as it has for twenty years. My guess is that the answer differs by category, and that news and analysis are among the first where quality wins.'),
];

const BODY_RIVER = [
  P('The river at Wilcannia is low again, and the town has stopped waiting for it to be otherwise. This is not resignation. It is something closer to a decision, made collectively over several years, to build a future that does not depend on water arriving from upstream on anyone else’s schedule.'),
  P('The Barkandji people have held native title over this stretch of the Darling since 2015. In practice, that recognition has meant less than the word suggests. Water allocations are decided hundreds of kilometres away; the river’s health is a line item in a plan negotiated between states. But the title created something that did not exist before: a legal standing from which to negotiate, and a reason for the town to organise.'),
  H2('A town that organised'),
  P('Over the past three years the community has established a water-monitoring program, taken over management of the local health service, and negotiated an agreement with the state that gives it a formal role in decisions about environmental flows. None of these things is dramatic. Together they have changed the town’s relationship with the institutions that govern it.'),
  P('"We used to be consulted," one elder told me, using the word with a familiar weariness. "Now we’re at the table. It’s not the same thing."'),
  Q('The river is not the town’s only story. But it is the story through which every other story is told.'),
  H2('What a treaty would change'),
  P('New South Wales has been slow to begin treaty negotiations, and the town does not expect a signed document soon. But the conversation has already shifted what people believe is possible. A treaty, whatever its final form, would formalise the arrangement the town has been building piece by piece: local decisions, made locally, with the state as a partner rather than an authority.'),
  P('Whether that holds when the next drought arrives is the question nobody can answer. The river will be low again. The difference is that the town no longer intends to be a bystander when it happens.'),
];

const BODY_PORTS = [
  P('Ports were, for two generations, the least strategic of infrastructure. They were commercial assets, leased to whichever operator bid highest, and their ownership was rarely discussed outside the finance pages. That era is ending, quietly and expensively, in almost every maritime economy at once.'),
  P('The change is visible in three places. Governments are reviewing foreign ownership of terminal operators, sometimes retrospectively. Navies are negotiating access to commercial berths that they had not needed since the Cold War. And insurers are pricing the risk of disruption into freight in ways that make previously marginal ports suddenly viable.'),
  H2('The return of the strategic port'),
  P('The logic is straightforward. Modern militaries depend on the same logistics networks as modern economies, and those networks run through a small number of large ports. Whoever controls, or can deny, those ports controls the tempo of any conflict. That was always true; it simply did not matter while conflict seemed remote.'),
  P('For Australia, the implications are direct. The lease of Darwin’s port to a Chinese-owned operator in 2015 has become a case study in how commercial decisions acquire strategic weight after the fact. Similar debates are now under way over terminals in Europe, the Gulf and the Pacific.'),
  Q('A port is a commercial asset until the day it is not, and by then it is too late to change the lease.'),
  H2('The cost of resilience'),
  P('Re-arming ports is not cheap. Redundant capacity, hardened infrastructure and reserved berths all reduce the efficiency that made global shipping so inexpensive. Consumers will pay for that in slightly higher prices for almost everything. The alternative, discovered too late, would cost far more.'),
  P('The question for policymakers is not whether to treat ports as strategic. That decision has effectively been made. It is how to do so without destroying the commercial logic that made them useful in the first place.'),
];

/* Generic bodies for supporting items — varied, original and reusable. */
const GENERIC = {
  analysis: (lead) => [
    P(lead),
    P('The headline numbers tell only part of the story. Behind them sits a set of assumptions that rarely get examined, partly because they are technical and partly because they are inconvenient to the people making decisions. This piece tries to examine them.'),
    H2('What the evidence shows'),
    P('Start with what can be measured. The trend over the past three years is clearer than the public debate suggests, and it points in a direction that neither side of that debate is entirely comfortable with. The data is imperfect, but it is not ambiguous.'),
    P('The second thing worth noting is the gap between stated policy and actual practice. Governments announce targets; agencies implement processes; the two drift apart over time. Closing that gap is less about new announcements than about attention to what already exists.'),
    Q('The interesting question is not whether the policy is right, but whether anyone is checking.'),
    H2('What would need to change'),
    P('Three changes would make a material difference. First, better data, published on a schedule people can plan around. Second, a clear statement of who is responsible when targets are missed. Third, a willingness to revise the approach when the evidence changes, rather than defending the original decision.'),
    P('None of this is novel. It is simply hard, because it requires the people involved to accept that they might be wrong. That is a higher bar than most policy debates set, and it explains why so many of them go nowhere.'),
  ],
  explainer: (lead) => [
    P(lead),
    H2('The short version'),
    P('The change is smaller than the headlines suggest and larger than its critics admit. It does not transform the system, but it does shift incentives in ways that will compound over several years.'),
    H2('Who is affected'),
    P('The immediate effects fall on a relatively small group. The wider effects, on prices, on behaviour and on expectations, will take longer to appear and will be harder to attribute to any single cause.'),
    P('The people most affected are, as usual, the people least likely to be asked about it. That is not a criticism of the policy so much as a description of how policy is made.'),
    H2('What to watch'),
    P('Three indicators will show whether this is working: whether the stated timelines hold, whether the funding survives the next budget, and whether the responsible agency reports honestly on its progress. Track those and you will know more than most commentators.'),
    P('The final thing to say is that reasonable people disagree about this, and the disagreement is not going away. The aim of this explainer is not to settle it but to make sure the argument is about what is actually happening.'),
  ],
  essay: (lead) => [
    P(lead),
    P('I have been thinking about this for some time, and I am less certain of my conclusions than I was when I started. That is usually a sign that the question is worth asking.'),
    H2('The argument'),
    P('The case is simple to state and hard to prove. Something changed in the past decade that made the old assumptions unreliable, and the institutions built on those assumptions have not yet noticed. When they do, the adjustment will be uncomfortable.'),
    P('The evidence for this is partly quantitative and partly a matter of pattern recognition. The quantitative evidence is suggestive but not decisive. The pattern is harder to dismiss.'),
    Q('The most dangerous assumptions are the ones nobody remembers making.'),
    H2('The objections'),
    P('The strongest objection is that the trend I am describing is cyclical rather than structural, and that patience will resolve it. This may be right. The problem is that patience is not free, and the costs of waiting fall unevenly.'),
    P('The second objection is that even if the trend is real, nothing practical can be done about it. I am more sympathetic to this than I would like to be. But the history of these questions suggests that what looks impossible in one decade becomes obvious in the next, usually after a crisis makes it unavoidable.'),
    P('So I offer this not as a prediction but as a way of seeing. If it is wrong, it is wrong in an interesting direction.'),
  ],
};

/* ---------- Items ----------
   worth: editorial weight (1–5) used by the "Three Worth Your Time" picker.
   hoursAgo: relative publish time so freshness/archive behave sensibly.
*/
export const ITEMS = [
  {
    id: 'fa-long-peace', type: 'article', sourceId: 'foreignaffairs', worth: 5, hoursAgo: 96,
    title: 'The Long Peace Was Never a Plan',
    dek: 'Great-power calm rested on nuclear fear, economic entanglement and living memory. All three are moving at once.',
    author: 'Helena Marsh', readMinutes: 28, topics: ['geopolitics', 'defence'], img: 'harbour-fog',
    body: BODY_LONG_PEACE, url: 'https://www.foreignaffairs.com/',
  },
  {
    id: 'afr-rba-pivot', type: 'article', sourceId: 'afr', worth: 5, hoursAgo: 3,
    title: 'The RBA’s quiet pivot: why the next move might not be a cut',
    dek: 'Read the last three statements together and a different framework emerges — one the market has not priced.',
    author: 'Daniel Okafor', readMinutes: 7, topics: ['economics', 'australia'], img: 'martin-place',
    body: BODY_RBA, url: 'https://www.afr.com/',
  },
  {
    id: 'int-jakarta', type: 'article', sourceId: 'interpreter', worth: 5, hoursAgo: 26,
    title: 'What Canberra gets wrong about Jakarta',
    dek: 'Three assumptions underpin most Australian thinking on Indonesia. Each is half true, and each leads policy astray.',
    author: 'Priya Natarajan', readMinutes: 9, topics: ['geopolitics', 'australia'], img: 'jakarta-dusk',
    body: BODY_JAKARTA, url: 'https://www.lowyinstitute.org/the-interpreter',
  },
  {
    id: 'perun-aukus', type: 'video', sourceId: 'perun', worth: 4, hoursAgo: 50,
    title: 'Submarines, Shipyards & Sovereign Capability — Can AUKUS Deliver?',
    dek: 'An hour on the industrial base behind the announcements: workforce, yards, and the awkward maths of eight boats.',
    durationSec: 58 * 60 + 14, topics: ['defence', 'australia'], img: 'dry-dock',
    description: 'A structured look at what it actually takes to build and sustain a nuclear-powered submarine fleet: the shipyards, the workforce pipeline, the supply chain, and the budget assumptions that underpin the program. As always, this is about the economics and the industrial base rather than the politics.',
    chapters: [[0, 'Introduction'], [4 * 60 + 10, 'What the plan actually says'], [14 * 60 + 30, 'Shipyards and workforce'], [27 * 60, 'The supply chain problem'], [39 * 60 + 45, 'Budget assumptions'], [51 * 60 + 20, 'Conclusions']],
    transcript: null, url: 'https://www.youtube.com/',
  },
  {
    id: 'econ-ports', type: 'article', sourceId: 'economist', worth: 4, hoursAgo: 30,
    title: 'The world is quietly re-arming its ports',
    dek: 'Terminals were commercial assets for two generations. Governments, navies and insurers have decided otherwise.',
    author: null, readMinutes: 11, topics: ['geopolitics', 'economics'], img: 'container-cranes',
    body: BODY_PORTS, url: 'https://www.economist.com/',
  },
  {
    id: 'abc-housing', type: 'article', sourceId: 'abc', worth: 3, hoursAgo: 5,
    title: 'Inside the housing pipeline: why approvals aren’t turning into homes',
    dek: 'Councils are approving more dwellings than at any point in a decade. Completions have barely moved. Here is where they go.',
    author: 'Sarah Whitlam', readMinutes: 6, topics: ['australia', 'economics', 'policy'], img: 'suburb-frames',
    body: GENERIC.explainer('Approvals are up. Completions are not. Understanding the gap between the two explains most of what is going wrong in Australian housing, and most of why the announced targets will be missed.'), url: 'https://www.abc.net.au/news',
  },
  {
    id: 'strat-aggregator', type: 'article', sourceId: 'stratechery', worth: 4, hoursAgo: 44,
    title: 'The Aggregator’s Dilemma, Revisited',
    dek: 'When discovery stops being the bottleneck, the businesses built on it face a choice they are structurally unable to make.',
    author: 'Ben Thompson', readMinutes: 14, topics: ['technology', 'economics'], img: 'glass-atrium',
    body: BODY_AGGREGATOR, url: 'https://stratechery.com/',
  },
  {
    id: 'conv-grid', type: 'article', sourceId: 'conversation', worth: 3, hoursAgo: 70,
    title: 'Australia’s grid is decarbonising faster than its politics',
    dek: 'Rooftop solar and storage have quietly rewritten the National Electricity Market. The policy debate hasn’t caught up.',
    author: 'Dr Michael Tran', readMinutes: 8, topics: ['science', 'australia', 'policy'], img: 'solar-field',
    body: GENERIC.analysis('The transformation of Australia’s electricity system has happened faster than almost anyone forecast, and it has happened despite rather than because of national policy.'), url: 'https://theconversation.com/au',
  },
  {
    id: 'aspi-greyzone', type: 'article', sourceId: 'strategist', worth: 3, hoursAgo: 20,
    title: 'Grey-zone tactics in the Pacific: what the data actually shows',
    dek: 'Incident counts are rising, but the pattern matters more than the number. A closer look at three years of reporting.',
    author: 'James Cheng-Morris', readMinutes: 10, topics: ['defence', 'geopolitics'], img: 'pacific-atoll',
    body: GENERIC.analysis('Reports of grey-zone activity in the Pacific have roughly doubled in three years. What the raw count obscures is a shift in where, how and by whom those incidents are occurring.'), url: 'https://www.aspistrategist.org.au/',
  },
  {
    id: 'caspian-central-asia', type: 'video', sourceId: 'caspian', worth: 3, hoursAgo: 66,
    title: 'Why Central Asia is the new energy chessboard',
    dek: 'Pipelines, rail corridors and the three powers competing to build them.',
    durationSec: 22 * 60 + 41, topics: ['geopolitics', 'economics'], img: 'steppe-rail',
    description: 'Central Asia sits between three of the world’s largest energy consumers and producers. This video looks at the corridors being built across the region, who is financing them, and why the geography makes the outcome harder to predict than the headlines suggest.',
    chapters: [[0, 'Introduction'], [3 * 60 + 5, 'The geography'], [8 * 60 + 40, 'Pipelines'], [14 * 60 + 10, 'Rail corridors'], [19 * 60, 'Who wins?']],
    transcript: null, url: 'https://www.youtube.com/',
  },
  {
    id: 'grattan-ndis', type: 'article', sourceId: 'grattan', worth: 3, hoursAgo: 52,
    title: 'Fixing the NDIS without breaking it',
    dek: 'The scheme is growing faster than the economy. The reforms on the table address symptoms; here is what addressing causes would look like.',
    author: 'Grattan Institute', readMinutes: 12, topics: ['australia', 'policy'], img: 'community-hall',
    body: GENERIC.analysis('The National Disability Insurance Scheme is one of Australia’s most important social reforms and one of its fastest-growing budget lines. Both facts are true, and the debate suffers from people who acknowledge only one of them.'), url: 'https://grattan.edu.au/',
  },
  {
    id: 'ft-dollar', type: 'article', sourceId: 'ft', worth: 3, hoursAgo: 6,
    title: 'The dollar’s slow erosion is a story about plumbing, not politics',
    dek: 'Reserve managers are diversifying, but the mechanics of settlement matter more than the headlines about de-dollarisation.',
    author: 'Ines Baptista', readMinutes: 9, topics: ['economics', 'geopolitics'], img: 'trading-floor',
    body: GENERIC.essay('Every few months a chart circulates showing the dollar’s share of global reserves drifting downward, accompanied by commentary about the end of American financial dominance. The chart is real. The commentary mostly misses the point.'), url: 'https://www.ft.com/',
  },
  {
    id: 'noah-industrial', type: 'article', sourceId: 'noahpinion', worth: 3, hoursAgo: 100,
    title: 'Industrial policy is back. Does anyone know how to do it?',
    dek: 'Governments have rediscovered the idea. The institutional knowledge to execute it was allowed to lapse for forty years.',
    author: 'Noah Smith', readMinutes: 15, topics: ['economics', 'policy'], img: 'factory-floor',
    body: GENERIC.essay('Industrial policy went from unmentionable to unavoidable in about five years. The speed of the reversal is a problem, because the capacity to do it well takes longer to rebuild than the political will to try.'), url: 'https://www.noahpinion.blog/',
  },
  {
    id: 'wendover-iron', type: 'video', sourceId: 'wendover', worth: 3, hoursAgo: 120,
    title: 'How Australia Moves 1.2 Billion Tonnes of Iron Ore',
    dek: 'The longest heavy-haul trains on Earth, the ports that load them, and the single customer that buys most of it.',
    durationSec: 19 * 60 + 8, topics: ['economics', 'australia'], img: 'ore-train',
    description: 'The Pilbara exports more iron ore than the rest of the world combined. This is how the trains, ports and ships work together, and what happens to the whole system when its largest customer slows down.',
    chapters: [[0, 'The Pilbara'], [4 * 60 + 20, 'Autonomous trains'], [9 * 60 + 15, 'Port Hedland'], [14 * 60, 'The China question']],
    transcript: null, url: 'https://www.youtube.com/',
  },
  {
    id: 'guardian-river', type: 'article', sourceId: 'guardianau', worth: 4, hoursAgo: 140,
    title: 'A river, a treaty and a town that stopped waiting',
    dek: 'On the Darling at Wilcannia, native title has meant less than the word suggests. The community has decided to build anyway.',
    author: 'Lorena Allam', readMinutes: 17, topics: ['australia'], img: 'darling-river',
    body: BODY_RIVER, url: 'https://www.theguardian.com/au',
  },
  {
    id: 'mr-productivity', type: 'article', sourceId: 'mr', worth: 2, hoursAgo: 12,
    title: 'The productivity slowdown might be a measurement problem',
    dek: 'A short note on why free digital goods make the statistics look worse than the economy feels.',
    author: 'Tyler Cowen', readMinutes: 4, topics: ['economics'], img: 'library-stacks',
    body: GENERIC.essay('Here is a thought I keep returning to: if a large share of what we now consume has a price of zero, GDP will systematically understate welfare, and productivity statistics will inherit the error.'), url: 'https://marginalrevolution.com/',
  },
  {
    id: 'quanta-random', type: 'article', sourceId: 'quanta', worth: 3, hoursAgo: 48,
    title: 'The mathematicians who are rethinking randomness',
    dek: 'A new framework treats chance as a property of the observer, not the world. It is upsetting some old certainties.',
    author: 'Amelia Ford', readMinutes: 13, topics: ['science'], img: 'chalkboard',
    body: GENERIC.essay('For a century, probability has been the mathematics of ignorance: what we say when we do not know. A small group of researchers now argue that this framing has quietly constrained what the field can describe.'), url: 'https://www.quantamagazine.org/',
  },
  {
    id: 'econ-taiwan-chips', type: 'article', sourceId: 'economist', worth: 3, hoursAgo: 118,
    title: 'Taiwan’s semiconductor shield is thinner than it looks',
    dek: 'The "silicon shield" theory assumes rational actors and long time horizons. Neither is guaranteed.',
    author: null, readMinutes: 10, topics: ['geopolitics', 'technology'], img: 'clean-room',
    body: GENERIC.analysis('The idea that Taiwan’s dominance in advanced chips deters conflict has become conventional wisdom. Like most conventional wisdom, it rests on assumptions that deserve inspection.'), url: 'https://www.economist.com/',
  },
  {
    id: 'abc-defence-review', type: 'article', sourceId: 'abc', worth: 3, hoursAgo: 28,
    title: 'Explainer: what the new defence review actually commits Australia to',
    dek: 'Beyond the dollar figures, the document makes four decisions that will shape the force for twenty years.',
    author: 'Andrew Probyn', readMinutes: 7, topics: ['defence', 'australia', 'policy'], img: 'parliament-house',
    body: GENERIC.explainer('The latest defence review runs to more than two hundred pages. Most of the coverage has focused on the headline spending figure. The more consequential content is elsewhere.'), url: 'https://www.abc.net.au/news',
  },
  {
    id: 'int-pif', type: 'article', sourceId: 'interpreter', worth: 2, hoursAgo: 150,
    title: 'Pacific Islands Forum: three things that mattered',
    dek: 'The communiqué was predictable. The corridors were not.',
    author: 'Meg Keen', readMinutes: 6, topics: ['geopolitics'], img: 'lagoon',
    body: GENERIC.explainer('The Pacific Islands Forum produced a communiqué that could have been written in advance. What mattered happened outside the plenary, and it deserves more attention than it has received.'), url: 'https://www.lowyinstitute.org/the-interpreter',
  },

  /* ----- Older: these fall into Archive under the default 7-day window ----- */
  {
    id: 'fa-middle-powers', type: 'article', sourceId: 'foreignaffairs', worth: 4, hoursAgo: 24 * 9,
    title: 'How Middle Powers Hedge',
    dek: 'Between alignment and neutrality lies a third strategy. It is harder than it looks.',
    author: 'Rana Mitter', readMinutes: 24, topics: ['geopolitics'], img: 'chess-shadows',
    body: GENERIC.essay('Hedging is the strategy everyone recommends and nobody defines. This essay tries to define it, and in doing so shows why it is so difficult to sustain.'), url: 'https://www.foreignaffairs.com/',
  },
  {
    id: 'strat-free-tier', type: 'article', sourceId: 'stratechery', worth: 3, hoursAgo: 24 * 12,
    title: 'The End of the Free Tier',
    dek: 'Inference costs are rewriting the economics of consumer software. Free is no longer a growth strategy.',
    author: 'Ben Thompson', readMinutes: 11, topics: ['technology', 'economics'], img: 'server-hall',
    body: GENERIC.analysis('For twenty years, the default consumer software strategy was to give the product away and monetise later. The cost structure that made this possible is disappearing.'), url: 'https://stratechery.com/',
  },
  {
    id: 'perun-budgets', type: 'video', sourceId: 'perun', worth: 3, hoursAgo: 24 * 15,
    title: 'Defence Budgets Explained: Where the Money Actually Goes',
    dek: 'Personnel, sustainment, acquisition — and why the headline number tells you almost nothing.',
    durationSec: 64 * 60 + 2, topics: ['defence', 'economics'], img: 'hangar',
    description: 'A breakdown of how defence budgets are structured, why the split between personnel, operations and acquisition matters more than the total, and what to look for when a government announces a spending increase.',
    chapters: [[0, 'Introduction'], [6 * 60, 'The three buckets'], [22 * 60, 'Sustainment'], [41 * 60, 'Acquisition'], [58 * 60, 'Summary']],
    transcript: null, url: 'https://www.youtube.com/',
  },
  {
    id: 'afr-super', type: 'article', sourceId: 'afr', worth: 3, hoursAgo: 24 * 20,
    title: 'Superannuation’s $4 trillion question',
    dek: 'The pool is now larger than the economy. What it should be invested in has become a political question.',
    author: 'Karen Maley', readMinutes: 8, topics: ['economics', 'australia', 'policy'], img: 'tower-glass',
    body: GENERIC.analysis('Australia’s superannuation savings have passed four trillion dollars. That milestone has turned a technical question about asset allocation into a political one about national priorities.'), url: 'https://www.afr.com/',
  },
  {
    id: 'conv-census', type: 'article', sourceId: 'conversation', worth: 2, hoursAgo: 24 * 10,
    title: 'What the census tells us about who is leaving the cities',
    dek: 'The regional shift is real but smaller and more selective than the coverage suggests.',
    author: 'Prof. Liz Allen', readMinutes: 7, topics: ['australia', 'policy'], img: 'coastal-town',
    body: GENERIC.explainer('The narrative of a great exodus from Australia’s cities has taken hold. The census data supports a more modest and more interesting story.'), url: 'https://theconversation.com/au',
  },
  {
    id: 'grattan-migration', type: 'article', sourceId: 'grattan', worth: 3, hoursAgo: 24 * 25,
    title: 'Migration and the housing debate: separating the numbers',
    dek: 'Both sides cite population growth. Almost nobody cites it correctly.',
    author: 'Grattan Institute', readMinutes: 14, topics: ['australia', 'economics', 'policy'], img: 'apartment-block',
    body: GENERIC.analysis('Migration has become the explanation of choice for Australia’s housing shortage. The relationship is real, but the numbers usually cited get it wrong in both directions.'), url: 'https://grattan.edu.au/',
  },
];

/* Resolve relative times to absolute timestamps once. */
for (const it of ITEMS) it.publishedAt = ago(it.hoursAgo);

/* Image helper: deterministic photography placeholder plus a warm tone
   used as the backdrop while the image loads (or offline). */
const TONES = ['#8a6f5c', '#5c6f7a', '#6f7a5c', '#7a5c6a', '#5c5c7a', '#7a6f5c', '#5c7a73'];
export function imageFor(item, w = 900, h = 600) {
  const seed = `curated-${item.img}`;
  let n = 0; for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return { src: `https://picsum.photos/seed/${seed}/${w}/${h}`, tone: TONES[n % TONES.length] };
}
