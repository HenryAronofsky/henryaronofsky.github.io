/* Everything the site says lives here. Stops appear along the walk in this
   order; each one gets a pop-up (title, subtitle, dates, highlight) and an
   expanded panel (everything else).

   Stop fields
     id         used in links, e.g. henryaronofsky.github.io/#bumblebee
     chapter    which header section it belongs to
     icon       small pixel icon (see ICONS in sprites.js)
     bigIcon    big background icon (defaults to icon)
     landmark   'school' | 'gate' to stand in a building instead of on a pedestal
     kicker     tiny label above the title
     title, subtitle, dates, place, highlight
     summary    first paragraph of the expanded panel
     facts      [label, value] pairs shown as a small table
     bullets    list of points
     sections   [{ heading, text: [paragraphs] }]
     media      [{ type: 'image' | 'video', src, poster, alt, caption }]
     links      [{ label, href }]
     related    [{ label, to: stop id, note }] buttons that walk you there
     tags       short chips */
window.HA = window.HA || {};

HA.content = {
  person: {
    name: 'Henry Aronofsky',
    role: 'Mechanical Engineering Undergrad at Harvard University',
    tagline: 'Building tools at the intersection of hardware and software — from ocean robotics to factory automation.',
    location: 'Cambridge, MA',
    focus: 'Robotics, manufacturing software',
    status: 'Open to opportunities',
    email: 'henryaronofsky@gmail.com',
    linkedin: 'https://www.linkedin.com/in/haronofsky/',
    github: 'https://github.com/HenryAronofsky/',
    website: 'https://henryaronofsky.github.io/',
    resume: 'Henry_Aronofsky_Resume.pdf'
  },

  chapters: [
    { id: 'start', label: 'Start' },
    { id: 'harvard', label: 'Harvard' },
    { id: 'experience', label: 'Experience' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'interests', label: 'Interests' },
    { id: 'contact', label: 'Contact' }
  ],

  stops: [
    {
      id: 'saint-anns',
      chapter: 'start',
      icon: 'book',
      landmark: 'school',
      kicker: 'Education',
      title: "Saint Ann's School",
      subtitle: 'High School Diploma',
      dates: 'Sep 2009 – Jul 2024',
      place: 'Brooklyn, NY',
      facts: [
        ['Diploma', 'High School'],
        ['Years', 'Sep 2009 – Jul 2024'],
        ['Location', 'Brooklyn, NY']
      ]
    },
    {
      id: 'harvard',
      chapter: 'harvard',
      icon: 'cap',
      landmark: 'gate',
      kicker: 'Education',
      title: 'Harvard University',
      subtitle: 'B.S. in Mechanical Engineering',
      dates: 'Aug 2024 – Feb 2028 (expected)',
      place: 'Cambridge, MA',
      highlight: 'Cumulative GPA 3.9',
      facts: [
        ['Degree', 'B.S. in Mechanical Engineering'],
        ['GPA', '3.9'],
        ['Graduation', 'Feb 2028 (expected)'],
        ['Focus', 'Robotics, manufacturing software']
      ],
      related: [
        { label: 'EuroRackingIt', note: 'ES50 project', to: 'eurorackingit' },
        { label: 'Bumblebee', note: 'ES51 project', to: 'bumblebee' },
        { label: 'Microrobotics Laboratory', note: 'Research', to: 'microrobotics' },
        { label: 'Harvard Jazz Orchestra', note: 'Double bass', to: 'jazz' },
        { label: 'Harvard-Radcliffe Dramatic Club', note: 'Theater technician', to: 'theater' }
      ]
    },

    {
      id: 'divergent',
      chapter: 'experience',
      icon: 'printer',
      kicker: 'Experience',
      title: 'Divergent',
      subtitle: 'Q&A Engineering Intern',
      dates: 'May 2026 – Sep 2026'
    },
    {
      id: 'microrobotics',
      chapter: 'experience',
      icon: 'rov',
      kicker: 'Experience',
      title: 'Harvard Microrobotics Laboratory',
      subtitle: 'Researcher',
      dates: 'Aug 2025 – Present',
      highlight: 'Ocean exploration and bio-data recovery tools',
      bullets: ['Design and optimize ocean exploration and bio-data recovery tools and systems'],
      related: [{ label: 'Jellyfish Motion Rig', note: 'Project from the lab', to: 'jellyfish' }]
    },
    {
      id: 'seas',
      chapter: 'experience',
      icon: 'chalkboard',
      kicker: 'Experience',
      title: 'Harvard SEAS',
      subtitle: 'Course Assistant',
      dates: 'Jan 2025 – Apr 2025',
      highlight: 'Teaching, labs and the machine shop',
      bullets: [
        'Advised and taught students on their projects and homework, and helped run labs and office hours with the teaching staff',
        'Operated lathes, CNC machines, and other machine shop equipment'
      ]
    },
    {
      id: 'nanotronics',
      chapter: 'experience',
      icon: 'chart',
      bigIcon: 'microscope',
      kicker: 'Experience',
      title: 'Nanotronics',
      subtitle: 'Design Engineering Intern',
      dates: 'May 2021 – Sep 2023',
      highlight: 'Factory-efficiency interface deployed at scale',
      bullets: [
        'Designed and implemented software solutions and visualizations for bespoke product lines',
        'Developed a factory-efficiency tracking interface that was deployed at scale to clients'
      ]
    },
    {
      id: 'nebula',
      chapter: 'experience',
      icon: 'laptop',
      bigIcon: 'code',
      kicker: 'Experience',
      title: 'Nebula',
      subtitle: 'Software Intern',
      dates: 'Mar 2019 – Mar 2021',
      highlight: 'Full-stack web applications',
      bullets: ['Developed full-stack web applications']
    },
    {
      id: 'tivoli',
      chapter: 'experience',
      icon: 'sailboat',
      kicker: 'Experience',
      title: 'Tivoli Sailing Company',
      subtitle: 'Summer Camp Counselor',
      dates: 'Jan 2018 – Jul 2023'
    },

    {
      id: 'bumblebee',
      chapter: 'portfolio',
      icon: 'robot',
      bigIcon: 'bee',
      kicker: 'ES51 · Fall 2024 · Team of 5',
      title: 'Bumblebee',
      subtitle: "Competition robot built for Harvard ES51's Turf Wars",
      highlight: 'Two full rounds, zero technical failures',
      summary:
        'A competition robot designed and built with a team of five ("The Hasanov Syndicate") for Harvard ES51\'s Turf Wars competition — a scoring arena that rewarded climbing ramps, collecting and storing objects, and a stacking challenge, all inside an 11"×11"×11" size limit.',
      media: [
        { type: 'image', src: 'portfolio/es51/bot.png', alt: 'Bumblebee, the finished competition robot', caption: 'Bumblebee — final build' },
        { type: 'image', src: 'portfolio/es51/explode.png', alt: 'Exploded CAD assembly of the scoop-lift mechanism', caption: 'Exploded assembly of the scoop-lift mechanism' }
      ],
      sections: [
        {
          heading: 'The challenge',
          text: [
            'Turf Wars scored robots on climbing a 30° ramp, collecting and storing six ping pong balls, picking up dog toys and hockey pucks to deposit in perimeter boxes, ringing a bell, and a separate stacking challenge with a ring, ball, and cube. Teams were limited to six actuators, four sheets of acrylic, and roughly ten weeks to design, fabricate, and test.'
          ]
        },
        {
          heading: 'Design',
          text: [
            'We compared concepts — a roller, a Sphero-style ball, a grabber, and several scoop variants — against each other with a Pugh matrix scored on height, hill-climbing ability, ball storage, and pick-up/drop-off performance. The winning "Dual Action" concept used a single 3D-printed scoop with built-in arm storage, driven by one servo through a hex shaft on a delrin support, so the same mechanism handled both ramp climbing and object collection. We also wired the remote control with rubber bands and inverted the polarity on a couple of components to make driving more intuitive.'
          ]
        },
        {
          heading: 'Result',
          text: ["We prioritized endurance over raw scoring potential. Bumblebee didn't win the competition, but it completed two full rounds with no technical failures."]
        }
      ],
      links: [{ label: 'Download full report (PDF)', href: 'portfolio/es51/Report.pdf' }]
    },
    {
      id: 'eurorackingit',
      chapter: 'portfolio',
      icon: 'synth',
      bigIcon: 'scope',
      kicker: 'ES50 · Team of 2',
      title: 'EuroRackingIt',
      subtitle: 'Fully analog 12-note piano built for Harvard ES50',
      highlight: 'No microcontroller — a pure analog signal path',
      summary:
        'A fully analog 12-note piano, built with a teammate for Harvard ES50. The circuit turns key presses into a variable voltage, tunes and shapes that voltage into a musical waveform, and pushes it out as audio — no microcontroller involved.',
      media: [
        { type: 'image', src: 'portfolio/es50/circuit.png', alt: 'Breadboard build of the analog synth', caption: 'Breadboard build' },
        { type: 'video', src: 'portfolio/es50/oscilloscope.mp4', poster: 'portfolio/es50/oscilloscope-poster.jpg', caption: 'The sawtooth output on the oscilloscope' },
        { type: 'image', src: 'portfolio/es50/schem.png', alt: 'Full circuit schematic', caption: 'Full schematic' },
        { type: 'image', src: 'portfolio/es50/flow.png', alt: 'Signal flow block diagram, from keyboard to audio output', caption: 'Signal flow, keyboard to audio output', wide: true }
      ],
      sections: [
        {
          heading: 'Keyboard interface',
          text: ['Each of the 12 keys taps a node on a resistor ladder, so pressing a key outputs a distinct voltage down a shared bus depending on where it sits in the divider.']
        },
        {
          heading: 'Tuning and oscillation',
          text: [
            'That voltage passes through an emitter follower and exponential converter, then into a tuning stage built from voltage adders and dividers that space the twelve tones to the equal-tempered scale. The oscillator core uses a 40106 hex Schmitt trigger inverter — wired with a diode, resistor, and capacitor — to generate a sawtooth wave at the tuned frequency.'
          ]
        },
        {
          heading: 'Output stage',
          text: ['The sawtooth is buffered, AC-coupled, and amplified before a waveform converter shapes it into the final tone, which passes through a second AC coupler and volume control to the audio output.']
        }
      ],
      links: [{ label: 'Download full report (PDF)', href: 'portfolio/es50/Report.pdf' }]
    },
    {
      id: 'jellyfish',
      chapter: 'portfolio',
      icon: 'jelly',
      kicker: 'Harvard Microrobotics Laboratory · Ongoing',
      title: 'Jellyfish Motion Rig',
      subtitle: 'Stepper-driven rig for jellyfish research',
      highlight: 'Arduino Mega + DM542T stepper driver',
      summary:
        'A stepper-motor-driven rig built to observe and record jellyfish movement, part of ongoing research at the Harvard Microrobotics Laboratory into ocean exploration and bio-data recovery tools.',
      media: [
        { type: 'image', src: 'portfolio/woodLab/jelly-web.jpg', alt: 'Jellyfish enclosure used for observation', caption: 'Jellyfish enclosure' },
        { type: 'image', src: 'portfolio/woodLab/stepper-web.jpg', alt: 'Stepper motor and driver controlled by an Arduino Mega', caption: 'Stepper driver and control electronics' }
      ],
      sections: [
        {
          heading: 'Overview',
          text: ['An Arduino Mega drives a stepper motor through a DM542T digital stepping driver to control the rig, while the jellyfish enclosure allows for controlled observation. This work is ongoing — more detail to follow as the project develops.']
        }
      ],
      related: [{ label: 'Harvard Microrobotics Laboratory', note: 'Where this lives', to: 'microrobotics' }]
    },
    {
      id: 'double-bass',
      chapter: 'portfolio',
      icon: 'bass',
      kicker: 'Side project',
      title: 'Scratch-Built Double Bass',
      subtitle: 'A four-string upright bass built from reclaimed lumber',
      highlight: 'Carved by hand from raw lumber',
      summary:
        'A four-string upright bass built from scratch out of reclaimed lumber — neck, pegbox, and body carved and assembled by hand, strung and tuned to play.',
      media: [
        { type: 'image', src: 'portfolio/sideProjects/doubleBass/DB.png', alt: 'Scratch-built double bass, neck and body detail', caption: 'Neck and body detail', tall: true },
        { type: 'image', src: 'portfolio/sideProjects/doubleBass/Playing.png', alt: 'Playing the finished double bass', caption: 'Finished instrument', tall: true }
      ],
      sections: [
        {
          heading: 'Overview',
          text: [
            'Built as a personal project outside of coursework, this bass is shaped from reclaimed wood rather than a kit — the neck and fingerboard planed and carved by hand, the pegbox fitted with real tuning machines, and four strings run down to a plank body. It plays like a proper upright bass, just built from nothing but raw lumber and hand tools.'
          ]
        }
      ],
      related: [{ label: 'Jazz Performance', note: 'Where it gets played', to: 'jazz' }]
    },
    {
      id: 'vehicle',
      chapter: 'portfolio',
      icon: 'car',
      bigIcon: 'sparkplug',
      kicker: 'Side project',
      title: 'Personal Vehicle Work',
      subtitle: 'Carburetor rebuild and engine work on a V8',
      highlight: 'Carb rebuild, coolant hoses, refitted engine',
      summary: 'Maintenance and repair work on a carbureted V8 — rebuilding the carburetor, replacing coolant hoses, and refitting the engine.',
      media: [
        { type: 'image', src: 'portfolio/sideProjects/cars/engine.jpg', alt: 'Refitted V8 engine', caption: 'Refitted engine', tall: true },
        { type: 'video', src: 'portfolio/sideProjects/cars/carbs.mp4', poster: 'portfolio/sideProjects/cars/carbs-poster.jpg', caption: 'Rebuilding the carburetor' },
        { type: 'video', src: 'portfolio/sideProjects/cars/coolant-hoses.mp4', poster: 'portfolio/sideProjects/cars/coolant-hoses-poster.jpg', caption: 'Replacing coolant hoses' }
      ],
      sections: [
        {
          heading: 'Overview',
          text: ['Working on an older carbureted V8, from rebuilding the carburetor to replacing worn coolant hoses and getting the refitted engine running again.']
        }
      ]
    },
    {
      id: 'plumbing',
      chapter: 'portfolio',
      icon: 'wrench',
      bigIcon: 'hammer',
      kicker: 'Side project',
      title: 'Plumbing & Construction',
      subtitle: 'Pipe fitting, plumbing, and general construction work',
      highlight: 'Drain lines, hose fittings and fence stakes',
      summary: 'Hands-on plumbing and construction work — cutting and fitting pipe, running a drain line, and building with basic hand tools.',
      media: [
        { type: 'video', src: 'portfolio/sideProjects/plumbingAndConstruction/plumbing.mp4', poster: 'portfolio/sideProjects/plumbingAndConstruction/plumbing-poster.jpg', caption: 'Connecting a washing machine hose' },
        { type: 'video', src: 'portfolio/sideProjects/plumbingAndConstruction/cutting-pipe.mp4', poster: 'portfolio/sideProjects/plumbingAndConstruction/cutting-pipe-poster.jpg', caption: 'Cutting drain pipe to fit' },
        { type: 'video', src: 'portfolio/sideProjects/plumbingAndConstruction/stakes.mp4', poster: 'portfolio/sideProjects/plumbingAndConstruction/stakes-poster.jpg', caption: 'Driving stakes for a fence' }
      ],
      sections: [
        {
          heading: 'Overview',
          text: ['General plumbing and construction work around the house — cutting and fitting drain pipe, connecting a washing machine hose, and framing with wooden stakes.']
        }
      ]
    },

    {
      id: 'theater',
      chapter: 'interests',
      icon: 'spotlight',
      bigIcon: 'masks',
      kicker: 'Interest',
      title: 'Musical Theater',
      subtitle: 'Theater Technician · Harvard-Radcliffe Dramatic Club',
      dates: 'Feb 2024 – Present',
      highlight: 'Both sides of the curtain',
      summary:
        "Musical theater is where I learned to work the way engineering teams work — a fixed deadline, a room full of people with different specialties, and a show that has to run whether or not everything went to plan. I've spent time on both sides of the curtain: performing, and building and running the technical side of productions.",
      sections: [
        {
          text: [
            'What keeps me coming back is the rehearsal process. A show gets built the same way a prototype does — rough it in, run it, find what breaks, fix it, run it again — except the iteration loop is measured in days and the final revision is performed live.',
            "I've been a theater technician with the Harvard-Radcliffe Dramatic Club since February 2024, working the technical side of its productions."
          ]
        }
      ],
      tags: ['Theater technician, HRDC', 'Tech & stagecraft']
    },
    {
      id: 'jazz',
      chapter: 'interests',
      icon: 'notes',
      kicker: 'Interest',
      title: 'Jazz Performance',
      subtitle: 'Double Bassist · Harvard Jazz Orchestra',
      dates: 'Sep 2026 – Present',
      highlight: 'Upright bass — the thing the arrangement stands on',
      summary:
        'I play upright bass in jazz settings — combo playing, standards, and the walking bass lines that hold a tune together while everyone else takes a turn out front. The bass is a structural job more than a melodic one, which is probably why it suits me: you are the thing the rest of the arrangement stands on.',
      sections: [
        {
          text: [
            'Jazz is also the one place where I do my best work without a plan. A chart gives you the changes and the form and nothing else, so the playing is made in real time, in response to whoever else is in the room. It is the closest thing I have found to thinking out loud with other people.',
            'My interest in the instrument eventually ran past playing it — I built a four-string upright double bass from scratch out of reclaimed lumber, carving the neck and fingerboard by hand.',
            'I play double bass with the Harvard Jazz Orchestra, which I joined in September 2026.'
          ]
        }
      ],
      related: [{ label: 'Scratch-Built Double Bass', note: 'The bass I built', to: 'double-bass' }],
      tags: ['Double bassist, Harvard Jazz Orchestra', 'Upright bass', 'Standards']
    },

    {
      id: 'contact',
      chapter: 'contact',
      icon: 'mailbox',
      bigIcon: 'envelope',
      kicker: 'Thanks for walking by',
      title: "Let's talk",
      subtitle: 'Email, LinkedIn, GitHub — or grab my résumé',
      highlight: 'henryaronofsky@gmail.com',
      contact: true
    }
  ]
};
