# Caster Companion
We're going to make an unofficial mobile companion app for MetaZoo (2025) so that players can have an easier time playing the game.

## Technology Considerations
**Platforms** - Android + iOS
It should be easily cross-platform across iOS and Android, but we'll be developing and testing on Android since that's what I have. 

**Free** - all the technology, frameworks, and API we use need to be completely free

**Default Offline** - the app should be offline by default, and be able to run run in airplane mode. We will likely add features that require online, but if you don't click on those screens, you shouldn't need to be online. Additionally, it should use offline/cached info where reasonable.

**Seamless Web** - It should be able to seamlessly integrate existing web pages or web data (like: https://www.metazootcg.com/how-to-play/errata).

**Strict Typing** - The programming language should be strictly typed.

**Light and Performant** - the app is meant to be extremely simple, and it should be quick to open and extremely responsive, not to mention easy on the battery.

**Automated Testing** - a quick, compile-time test suite (sub-minute total time) should be made as we add features and help us from making regressions. We should lean heavily towards simple unit and integration style tests and stay away from heavy black-box / selenium style tests for now.

**Build Management** - APKs should be output in a fashion that so that I can test the build easily without plugging in my phone. Perhaps releases on the github repo or something similar could be used? I will primarily interact with this by downloading that APK, testing manually, and giving feedback, so make those builds after each major change for me to test out.

## Style 

The style should be reminsicent of the MetaZoo cards and particularly the caster cards, but not use any art or look too similar to official branding to be confused with official software.

## Feature List

### Life Tracker Screen

1. Mission Point Tracker
Counting up from 0 on each of 2 sides
* When saving scores, load fresh instead of loading the last scores if it's been longer than 15 minutes since the app was closed.
* When you cross 30 Mission Points, change the color of the background, but let it keep counting.
* Mission Point Tracker should be in the center of the 3 tabs, and it should always be the default selected when opening the app.
* When you tick up/down quickly, make a small number that briefly shows how many you've ticked up (or down) in the sequence (i.e. within a quick timeframe), similar to the Magic Companion app.

2. Priority Tracker
A way to identify which player is supposed to go first this round, and click to move it to the other side when a round ends.

3. *Round Counter
A small, subtle number tracking how many rounds have gone by to keep an eye on game length, based on when priority was passed. Keep it off screen and fly it out in the middle once a menu button, opposite the reset button, has been clicked.

4. *Round Timer
A small, subtle timer (e.g. 05:41) to track how much time has elapsed since the game started. Keep it off screen and fly it out in the middle once a menu button, opposite the reset button, has been clicked.

### Rules Screen

5. **Rules Lookup - If it's possible, hit a free/open LLM to ask ruling questions.  I've had tremendous luck just typing in questions like "In MetaZoo 2025, when I do X with Y, what happens?" or "In MetaZoo 2025, what does give +2 influence mean? vs gain +2 influence?"

6. *Quick Rulebook - if it's not possible to do the LLM-based one, at least having quick, offline (cached?) access to the rulebook (available via PDF), errata page, and other key info to search would be perfect.

### Cryptid Search

7. **A screen where you can search by cryptid name or location and turn up cryptids using the same data that is visualized on the metazootcg.com website

* Single Stretch Goal
** Double Stretch Goal
