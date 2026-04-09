// ─── EMBERHOLD — The Lore of the First Flame ─────────────────────────────────
// Written for the world of Emberhold. Use these in dialogue, item descriptions,
// dungeon notes, and environmental storytelling.

export interface LoreEntry {
  id: string;
  title: string;
  body: string;
  source: 'note' | 'tablet' | 'item' | 'npc' | 'environment';
  unlocked: boolean;
}

// ── World History ─────────────────────────────────────────────────────────────

export const WORLD_LORE: LoreEntry[] = [
  {
    id: 'lore_firstflame',
    title: 'The First Flame',
    body: `Long before the cities, before the roads, before the first stone was set upon another, there was the dark. A darkness so complete it had weight — you could push against it with your hands and feel it push back.

A hero-king named Auren descended into the deepest cavity beneath the world, carrying only a lantern and a promise. What he found there, no record agrees on. Some say a sleeping god. Some say the world's own heart.

What he brought back was fire.

Not the fire of friction and wood. Something older. Something that remembered being stars. He called it the Ember, built a great chamber to house it, and named the city that grew around it Emberhold.

For three hundred years, the Ember burned without wavering.`,
    source: 'tablet',
    unlocked: false,
  },
  {
    id: 'lore_keepers',
    title: 'The Line of Keepers',
    body: `Auren left behind an order: the Keepers of the Flame. Each generation, one was chosen — not by birth or blood, but by the Ember itself. It would flare when the right person passed.

The Keepers lived long. Longer than they should. There was a theory that the Ember preserved them, that tending its light slowed the dark inside a person.

The last Keeper to be chosen that way was Mael, four generations ago. After Mael died with no successor named, the line passed by inheritance. It weakened. Each generation, the Ember burned a little lower.

Nobody said so aloud. Nobody wanted to be the one who noticed.`,
    source: 'note',
    unlocked: false,
  },
  {
    id: 'lore_vael',
    title: 'The Betrayal',
    body: `His name was Vael. He was the last Keeper — or should have been.

Vael was brilliant. Devoted. He spent thirty years studying the Ember's light, mapping its properties, writing theses no one else could read. He concluded something that broke him:

The Ember was a cage.

Not for darkness. For humanity. It kept people here, in this valley, afraid to leave, afraid of the night, building their whole civilization around the maintenance of a single flame. Vael believed the dark wasn't something to be fought. It was something to be walked into, and walked out of, and that the Ember was preventing the world from growing up.

So he put it out.

The shades came within the hour.`,
    source: 'tablet',
    unlocked: false,
  },
  {
    id: 'lore_kaelen',
    title: 'The Wanderer',
    body: `You didn't know about Vael when Elara's letter found you. You knew him only as the brother who left when you were twelve — the one who was always reading, always scribbling in margins, always looking at the horizon like it owed him something.

You looked for him for years. Then you stopped looking.

The letter said: come to Emberhold. The flame is dying. We need a Keeper.

You didn't think of Vael when you read it. You thought about the cold that had been seeping into everything lately. The way animals had started moving south. The way the stars looked different at the edge of night.

You packed your sword and started walking.`,
    source: 'npc',
    unlocked: true,
  },
  {
    id: 'lore_shades',
    title: 'What the Shades Are',
    body: `Brother Cael will tell you, if you ask him three times (he won't answer the first two — a habit from the old rites):

The shades are not creatures. They are absences. They are what fills a space when light leaves it. The Ember didn't keep them out the way a wall keeps out rain. It kept them from forming. 

Put out a candle in a dark room. The dark doesn't rush in. It was already there, waiting to be noticed.

The shades were always there, beneath the city. Vael didn't create them. He just introduced them to the staircase.`,
    source: 'npc',
    unlocked: false,
  },
];

// ── NPC Dialogue Trees ────────────────────────────────────────────────────────

export interface DialogueLine {
  speaker: string;
  text: string;
  choices?: Array<{ label: string; next: string }>;
}

export interface DialogueTree {
  id: string;
  lines: Record<string, DialogueLine[]>;
}

export const DIALOGUE: Record<string, DialogueTree> = {
  baelor: {
    id: 'baelor',
    lines: {
      root: [
        {
          speaker: 'Baelor',
          text: 'You\'re the one Elara sent for. Good. We need someone who\'s comfortable with fire.',
          choices: [
            { label: 'What can you make me?', next: 'forge' },
            { label: 'Tell me about yourself.', next: 'backstory' },
            { label: 'I\'ll talk to you later.', next: 'end' },
          ],
        },
      ],
      forge: [
        {
          speaker: 'Baelor',
          text: 'Weapons, armour, tools. If it can be made from metal and ember-heat, I can make it. Come back when you have materials.',
        },
      ],
      backstory: [
        {
          speaker: 'Baelor',
          text: 'Forty years at this forge. My daughter learned to walk in this room, burned herself on the bellows at three years old, laughed about it.',
        },
        {
          speaker: 'Baelor',
          text: 'She went down into the dark after the first wave of shades. Said she\'d find the source. That was eight months ago.',
        },
        {
          speaker: 'Baelor',
          text: 'I\'ve kept the forge burning. It\'s the only thing I know how to do while I wait.',
        },
      ],
      end: [{ speaker: 'Baelor', text: 'The forge is always open.' }],
    },
  },

  elara: {
    id: 'elara',
    lines: {
      root: [
        {
          speaker: 'Elara',
          text: 'Kaelen. You came. I didn\'t know if the letter would reach you.',
          choices: [
            { label: 'Tell me what happened to the flame.', next: 'flame' },
            { label: 'What do you need from me?', next: 'mission' },
            { label: 'Do you know where Vael is?', next: 'vael' },
          ],
        },
      ],
      flame: [
        {
          speaker: 'Elara',
          text: 'Someone extinguished it deliberately. The mechanism was... elegant, actually. A resonance disruption. Whoever did it understood the Ember\'s nature better than I do.',
        },
        {
          speaker: 'Elara',
          text: 'The flame isn\'t gone. It retreated. Down into the deep chambers. You need to follow it there, and rekindle it at the source.',
        },
      ],
      mission: [
        {
          speaker: 'Elara',
          text: 'Descend through the Hollows beneath the city. Each floor goes deeper, closer to where the Ember sleeps. Clear the shades. Relight the beacons. Reach the heart-chamber.',
        },
        {
          speaker: 'Elara',
          text: 'I know it sounds simple when I say it. I\'m sorry that it isn\'t.',
        },
      ],
      vael: [
        {
          speaker: 'Elara',
          text: '...',
        },
        {
          speaker: 'Elara',
          text: 'There is something I need to tell you. But not yet. Descend first. What you find below will answer the question better than I can.',
        },
      ],
    },
  },

  mira: {
    id: 'mira',
    lines: {
      root: [
        {
          speaker: 'Mira',
          text: 'The Guttered Lamp. Fitting name, isn\'t it. I almost renamed it after the flame died, but — what would I call it? The Stubborn Lamp? The Refusing-to-Give-Up Lamp?',
          choices: [
            { label: 'Give me your strongest.', next: 'drink' },
            { label: 'How are people holding up?', next: 'town' },
            { label: 'Have you seen my brother? Tall, reads too much.', next: 'vael' },
          ],
        },
      ],
      drink: [{ speaker: 'Mira', text: 'My strongest is Ember-Mash, sixty-percent, tastes like regret and warmth. Three embers.' }],
      town: [
        { speaker: 'Mira', text: 'Scared. But people are still eating, still sleeping. The wall holds.' },
        { speaker: 'Mira', text: 'The wanderers who haven\'t left are mostly here every night. This place has become... something between a tavern and a prayer hall.' },
      ],
      vael: [
        { speaker: 'Mira', text: 'A scholar? Serious face, always looked like he was solving an equation?' },
        { speaker: 'Mira', text: 'He was here. About a year ago. Sat alone, didn\'t drink much, left before dawn. Paid in old coin. The kind we haven\'t minted in fifty years.' },
        { speaker: 'Mira', text: 'Didn\'t ask his name. Should have.' },
      ],
    },
  },

  orin: {
    id: 'orin',
    lines: {
      root: [
        {
          speaker: 'Orin',
          text: 'The Clocktower has kept perfect time for two hundred and eleven years. Not because of gears. Because someone remembered to wind it, every morning, without exception.',
          choices: [
            { label: 'What do you sell?', next: 'relics' },
            { label: 'You seem like you remember a lot.', next: 'memory' },
          ],
        },
      ],
      relics: [
        { speaker: 'Orin', text: 'I trade in what was lost and found. Old things with old purposes. Some of them still work. Some of them work in ways I haven\'t figured out yet.' },
      ],
      memory: [
        { speaker: 'Orin', text: 'I remember the last time the flame wavered. Sixty years ago. A bad winter. People said the same things they\'re saying now.' },
        { speaker: 'Orin', text: 'The difference is, last time, nobody had put it out on purpose.' },
        { speaker: 'Orin', text: 'The darkness has patience. The flame has to be chosen, again and again. That\'s what the wanderers are for.' },
      ],
    },
  },

  cael: {
    id: 'cael',
    lines: {
      root: [
        {
          speaker: 'Brother Cael',
          text: 'You found the shrine. Most people walk past it now. The ember above the door doesn\'t glow anymore, and people mistake that for the shrine being closed.',
          choices: [
            { label: 'I want a blessing.', next: 'blessing' },
            { label: 'Tell me about the shades.', next: 'shades' },
          ],
        },
      ],
      blessing: [
        { speaker: 'Brother Cael', text: 'Leave an offering of embers at the stone. The old fire remembers even when it sleeps. It will remember you too.' },
      ],
      shades: [
        { speaker: 'Brother Cael', text: 'Ask me again.' },
      ],
    },
  },

  joren: {
    id: 'joren',
    lines: {
      root: [
        {
          speaker: 'Captain Joren',
          text: 'The gate holds. My soldiers hold. But we lose one to the dark every week, and I\'m out of soldiers to lose.',
          choices: [
            { label: 'I\'m heading below. What do you need?', next: 'bounty' },
            { label: 'How long can you hold?', next: 'time' },
          ],
        },
      ],
      bounty: [
        { speaker: 'Captain Joren', text: 'There\'s a creature in the second hollow — a Bone Chanter. It\'s been organizing the shades into something resembling tactics. Kill it and I\'ll reward you.' },
      ],
      time: [
        { speaker: 'Captain Joren', text: 'A month. Maybe two if we\'re careful with supplies.' },
        { speaker: 'Captain Joren', text: 'The scholars say \'rekindling the flame\' will dispel the shades. I hope they\'re right. I\'m not sure I believe in hope anymore, but I hope they\'re right.' },
      ],
    },
  },
};

// ── Item Descriptions ─────────────────────────────────────────────────────────

export const ITEM_LORE: Record<string, string> = {
  ember_draught: 'A phial of concentrated ember-light. It tastes like iron and old sunlight. Heals 40 HP.',
  shadow_ward: 'Vesna boils dungeon moss and cave flowers until the extract smells like rain. It shouldn\'t work. It does. +30 DEF for 60 seconds.',
  emberblood: 'Red as fire, bitter as grief. Warriors used to drink it before charging into the dark. +40% ATK for 45 seconds.',
  phoenix_vial: 'Auren\'s journals mention a substance the old scholars called \'second breath\'. This may be a recreation, or it may be the last original phial. Revives once on death.',
  ashen_locket: 'A brass locket containing a curl of ash. The name inside is worn away. Whoever it mourned is gone, but the locket remembers them. Revive once per floor.',
  keepers_eye: 'A glass lens ground from ember-crystal. Through it, the weak points of creatures glow. Reveals HP and vulnerabilities.',
  hollows_pact: 'A contract signed in shadow-ink. The signature at the bottom is illegible, but the terms are clear. +30% damage, -20% max HP.',
  ember_heart: 'A smooth red stone that pulses faintly. It should not be alive. It is. Killing enemies restores 2 HP.',
  wanderers_boots: 'Worn leather, resoled three times. The original owner walked so far the boots learned the shape of motion. Dodge grants longer i-frames.',
  cinder_ring: 'The band is scorched. The setting is empty. Whatever gem sat here burned away long ago, leaving only heat. Attacks apply Burn.',
};

// ── Dungeon Notes ─────────────────────────────────────────────────────────────

export const DUNGEON_NOTES: Array<{ id: string; title: string; text: string; floor: number }> = [
  {
    id: 'note_ranger',
    title: 'Torn Page',
    text: 'Day 3 below. The shades don\'t attack immediately — they study you first. I think they learn. Don\'t let them watch you fight the same way twice.',
    floor: 1,
  },
  {
    id: 'note_soldier',
    title: 'Guard\'s Last Report',
    text: 'Encountered a shade that mimicked Captain Joren\'s voice. Yelled orders. Two of my unit obeyed before I realized. The dark is clever down here.',
    floor: 2,
  },
  {
    id: 'note_scholar',
    title: 'Research Notes — Damaged',
    text: '...the resonance disruption was elegant. Whoever designed it understood harmonic cancellation at a level that exceeds— [ink smeared] —if the initiator is still in the deep chambers, they would be— [torn]',
    floor: 3,
  },
  {
    id: 'note_countdown',
    title: 'Scratched Into the Wall',
    text: 'Day 1. Day 2. Day 3. Day 4. Day 5. Day 6. Day 7. Day 8. Day 9. Day 10. Day 11.\n[The counting stops at eleven. Below it, in different handwriting: "They stopped counting on day twelve. I know because I was there."',
    floor: 4,
  },
  {
    id: 'note_vael',
    title: 'Familiar Handwriting',
    text: 'The flame was a choice. Not theirs — yours. Every generation, someone chooses to tend it instead of leaving. I have decided to un-make that choice, on behalf of all the generations who never got to make it.\n\nI know you will come after me. I know you will try to relight it.\n\nI am sorry, Kaelen. I hope you understand, eventually, that I was trying to set you free.',
    floor: 5,
  },
];
