import React, { Component } from 'react';
import './App.css';
import { Dropdown, TextBox, escapeRegExp, storageAvailable, isMobile, normalizeName } from './utils/utility.js';
import { parseSkills, getRandomUnit, getUnitsWithSkill, getPossibleSkills, getUpgradeEffect, getLowestRarity,
         calcStats, calcCost, calcTotalCost } from './utils/helper.js';
import { units, weapons, assists, specials, passives, seals, //upgrades,
         moveIcon, weaponIcon, rarityIcon, skillTypeIcon, unitPortrait } from './utils/data.js';
import { unitSortFn } from './utils/sort.js';
import BuildManager from './components/BuildManager.js';

class SkillInfoRow extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showRarities: []
    };

    this.handleSkillSelect = this.handleSkillSelect.bind(this);
    this.handlePassiveSkillSelect = this.handlePassiveSkillSelect.bind(this);
    this.handleSkillLevelSelect = this.handleSkillLevelSelect.bind(this);
    this.handleWeaponUpgradeSelect = this.handleWeaponUpgradeSelect.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.skillName !== prevProps.skillName)
      this.setState({
        showRarities: []
      });
  }

  handleSkillSelect(skillName) {
    this.props.onSkillSelect(skillName, this.props.skillType);
  }

  handlePassiveSkillSelect(skillName) {
    let fullName = this.getPassiveLevels(skillName, this.props.skillType, true);
    this.props.onSkillSelect(fullName ? fullName : skillName, this.props.skillType);
  }

  handleSkillLevelSelect(skillLevel) {
    this.props.onSkillSelect(/[^1-9]*/.exec(this.props.skillName)[0] + skillLevel, this.props.skillType);
  }

  handleWeaponUpgradeSelect(upgradeType) {
    this.props.onSkillSelect(upgradeType, 'upgrade');
  }

  handleExpandClick(rarity) {
    let shown = this.state.showRarities;
    shown.push(rarity);

    this.setState({
      showRarities: shown
    });
  }

  getPassiveLevels(skillName, skillType, getFullMaxPassive = false) {
    let type = skillType === 'passiveA' ? 'A' :
               skillType === 'passiveB' ? 'B' :
               skillType === 'passiveC' ? 'C' : 'S';

    let result = new Set();
    for (let key in (type !== 'S' ? passives[type] : seals)) {
      if (RegExp('^' + escapeRegExp(skillName)).test(key)) {
        if (!/\d/.test(key))
          return null;
        let level = RegExp('^' + escapeRegExp(skillName) + '([1-9])').exec(key);
        if (level)
          result.add(level[1]);
        else
          break;
      }
    }
    
    if (getFullMaxPassive)
      return skillName + [...result][result.size-1];
    
    return [...result];
  }

  formatInheritList() {
    let inheritList = this.props.inheritList;
    let result = [];

    for (var rarity in inheritList) {
      if (inheritList[rarity]) {
        result.push(rarity, <img className="rarity-icon" src={rarityIcon[rarity]} title={rarity + '★'} alt={rarity + '★'} key={rarity} />, ': ');
        
        if (this.props.showMinRarity && result.length > 5 && !this.state.showRarities.includes(rarity)) {
          result.push(<span title={inheritList[rarity].join(', ')} onClick={this.handleExpandClick.bind(this, rarity)} key={rarity + ' condensed'} >... </span>);
        }
        else {
          if (this.props.usePortraits) {
            for (let unitName of inheritList[rarity]) {
              result.push(<img className="unit-portrait-small" src={unitPortrait[normalizeName(unitName)]} title={unitName} alt={unitName} key={unitName} />)
            }
            result.push(' ');
          }
          else {
            result.push(inheritList[rarity].join(', '));
            result.push('. ');
          }
        }
      }
    }

    return result;
  }

  render() {
    let inheritList = this.formatInheritList();

    let skillDropdown, skillLevel;
    let hasSkillLevel = false;

    let fontScale = 1;

    if (this.props.effect.length > 160) {
      fontScale += (1 / (1 + ((this.props.effect.length - 160) / 10)) - 1) / 10;
      if (fontScale < 0.9) fontScale = 0.9;
    }
    
    try {
      if (this.props.skillName && this.props.category === 'Weapon' && weapons[this.props.skillName].upgrade) {
        var upgradeFlags = weapons[this.props.skillName].upgrade;
        hasSkillLevel = true;
        skillDropdown = 
          <td className="skill-name-sub">
            <Dropdown addClass='skillNameSub'
                      options={this.props.options}
                      value={this.props.skillName}
                      onChange={this.handleSkillSelect} />
          </td>;
        skillLevel =
          <td className="skill-level">
            <Dropdown addClass='skillLevel'
                      options={(/Legendary|Special/.test(upgradeFlags) ? ['', 'X'] : ['']).concat(['A', 'S', 'D', 'R'])}
                      value={this.props.upgrade}
                      onChange={this.handleWeaponUpgradeSelect} />
          </td>;
      } else if (this.props.skillName && this.props.category === 'Weapon' && weapons[this.props.skillName].type === 'Staff' && /\+/.test(this.props.skillName)) {
        hasSkillLevel = true;
        skillDropdown = 
          <td className="skill-name-sub">
            <Dropdown addClass='skillNameSub'
                      options={this.props.options}
                      value={this.props.skillName}
                      onChange={this.handleSkillSelect} />
          </td>;
        skillLevel =
          <td className="skill-level">
            <Dropdown addClass='skillLevel'
                      options={['', 'W', 'D']}
                      value={this.props.upgrade}
                      onChange={this.handleWeaponUpgradeSelect} />
          </td>;
      } else if (/[1-9]/.test(this.props.skillName)) {
        hasSkillLevel = true;
        skillDropdown = 
          <td className="skill-name-sub">
            <Dropdown addClass='skillNameSub'
                      options={this.props.options}
                      value={/[^1-9]*/.exec(this.props.skillName)[0]}
                      onChange={this.handlePassiveSkillSelect} />
          </td>;
        skillLevel =
          <td className="skill-level">
            <Dropdown addClass='skillLevel'
                      options={this.getPassiveLevels(/[^1-9]*/.exec(this.props.skillName)[0], this.props.skillType)}
                      value={/[1-9]/.exec(this.props.skillName)[0]}
                      onChange={this.handleSkillLevelSelect} />
          </td>;
      } else {
        skillDropdown = 
          <td className="skill-name" colSpan="2">
            <Dropdown addClass='skillName'
                      options={this.props.options}
                      value={this.props.skillName}
                      onChange={/passive|seal/.test(this.props.skillType) ? this.handlePassiveSkillSelect : this.handleSkillSelect} />
          </td>;
      }
    }
    catch (e) {
      skillDropdown = 
        <td className="skill-name" colSpan="2">
          <Dropdown addClass='skillName'
                    options={this.props.options}
                    value={this.props.skillName}
                    onChange={/passive|seal/.test(this.props.skillType) ? this.handlePassiveSkillSelect : this.handleSkillSelect} />
        </td>;
    }
    
    if (isMobile()) {
        return(
          <tbody>
            <tr>
              <td className="skill-type">
                {
                  this.props.category === "Weapon"  ? <img src={skillTypeIcon.Weapon} title="Weapon" alt="Weapon" /> :
                  this.props.category === "Assist"  ? <img src={skillTypeIcon.Assist} title="Assist" alt="Assist" /> :
                  this.props.category === "Special" ? <img src={skillTypeIcon.Special} title="Special" alt="Special" /> :
                                                      this.props.category
                }
              </td>
              {skillDropdown}
              {hasSkillLevel && skillLevel}
              <td className="skill-info-container">
                <div className="skill-inherit">{inheritList}</div>
              </td>
              <td className="skill-info-container">
                <div className="skill-cost">{this.props.cost || ''}</div>
              </td>
            </tr>
            {!!this.props.showDesc &&
              <tr>
                <td></td>
                <td className="skill-info-container" colSpan="4">
                  <div className="skill-effect">
                    {
                      fontScale === 1 ? <p>{this.props.effect}</p>
                        : <p style={{'font-size': fontScale + 'em'}}>{this.props.effect}</p>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        );
    }
    else {
      return (
        <tbody>
          <tr>
            <td className="skill-type">
              {
                this.props.category === "Weapon"  ? <img src={skillTypeIcon.Weapon} title="Weapon" alt="Weapon" /> :
                this.props.category === "Assist"  ? <img src={skillTypeIcon.Assist} title="Assist" alt="Assist" /> :
                this.props.category === "Special" ? <img src={skillTypeIcon.Special} title="Special" alt="Special" /> :
                                                    this.props.category
              }
            </td>
            {skillDropdown}
            {hasSkillLevel && skillLevel}
            {!!this.props.showDesc &&
            <td className="skill-info-container">
              <div className="skill-effect">
                {
                  fontScale === 1 ? <p>{this.props.effect}</p>
                    : <p style={{fontSize: fontScale + 'em'}}>{this.props.effect}</p>
                }
              </div>
            </td>
            }
            <td className="skill-info-container">
              <div className="skill-inherit">{inheritList}</div>
            </td>
            <td className="skill-info-container">
              <div className="skill-cost">{this.props.cost || ''}</div>
            </td>
          </tr>
        </tbody>
      );
    }
  }
}

class SkillInfoTable extends Component {
  constructor(props) {
    super(props);
    this.handleSkillSelect = this.handleSkillSelect.bind(this);
  }

  handleSkillSelect(skillName, skillType) {
    this.props.onSkillSelect(skillName, skillType);
  }

  getInheritList(unitName, skill, type) {
    if (!skill) return '';
    
    let unitList = getUnitsWithSkill(skill, type);
    let exclude = [];

    for (let rarity in unitList) {
      for (let unit of unitList[rarity]) {
        if (/^(Alfonse: Prince of Askr|Anna: Commander|Sharena: Princess of Askr)$/.test(unit))
          exclude.push(unit);
        // if (RegExp(escapeRegExp(unitName) + '$').test(unit))
        //   return '';
      }
      
      for (let unit of exclude) {
        if (unitList[rarity].includes(unit)) {
          unitList[rarity].splice(unitList[rarity].indexOf(unit), 1);
          if (!unitList[rarity].length)
            delete unitList[rarity];
        }
      }
    }
    
    return unitList;
  }

  render() {
    let skills = {};
    skills.weapon = this.props.skills.weapon;
    skills.upgrade = this.props.skills.upgrade;
    skills.assist = this.props.skills.assist;
    skills.special = this.props.skills.special;
    skills.passiveA = this.props.skills.passiveA;
    skills.passiveB = this.props.skills.passiveB;
    skills.passiveC = this.props.skills.passiveC;
    skills.seal = this.props.skills.seal;
    
    let skillOptions = getPossibleSkills(this.props.unitName);

    let weaponEffect = '';
    if (weapons[skills.weapon]) {
      weaponEffect += 'Might: ' + weapons[skills.weapon].might + '. ';

      if (skills.upgrade)
        weaponEffect += getUpgradeEffect(skills.weapon, skills.upgrade, this.props.unitName);
      else
        weaponEffect += weapons[skills.weapon].effect;
    }
    
    return (
      <table>
        <thead>
          <tr className="skill-header">
            <th className="reset-button-cell"></th>
            <th colSpan="2" className="dropdown-header text-left">Skill</th>
            {!isMobile() && !!this.props.showDesc && <th className="text-left">Effect</th>}
            <th className="text-left">Inherited From</th>
            <th>SP</th>
          </tr>
        </thead>
        <SkillInfoRow category='Weapon' 
                      skillName={skills.weapon}
                      skillType='weapon'
                      options={skillOptions.weapons}
                      upgrade={skills.upgrade}
                      effect={weaponEffect} 
                      inheritList={this.getInheritList(this.props.unitName,skills.weapon,'weapon')}
                      cost={calcCost(this.props.unitName, this.props.skills.weapon, this.props.skills.upgrade)}
                      usePortraits={this.props.usePortraits}
                      showDesc={this.props.showDesc}
                      showMinRarity={this.props.showMinRarity}
                      onSkillSelect={this.handleSkillSelect} />
        <SkillInfoRow category='Assist' 
                      skillName={skills.assist}
                      skillType='assist'
                      options={skillOptions.assists}
                      effect={assists[skills.assist] ? assists[skills.assist].effect : ''} 
                      inheritList={this.getInheritList(this.props.unitName,skills.assist,'assist')}
                      cost={calcCost(this.props.unitName, this.props.skills.assist)}
                      usePortraits={this.props.usePortraits}
                      showDesc={this.props.showDesc}
                      showMinRarity={this.props.showMinRarity}
                      onSkillSelect={this.handleSkillSelect} />
        <SkillInfoRow category='Special' 
                      skillName={skills.special}
                      skillType='special'
                      options={skillOptions.specials}
                      effect={specials[skills.special] ? 'Charge: ' + specials[skills.special].count + '. ' + specials[skills.special].effect : ''} 
                      inheritList={this.getInheritList(this.props.unitName,skills.special,'special')}
                      cost={calcCost(this.props.unitName, this.props.skills.special)}
                      usePortraits={this.props.usePortraits}
                      showDesc={this.props.showDesc}
                      showMinRarity={this.props.showMinRarity}
                      onSkillSelect={this.handleSkillSelect} />
        <SkillInfoRow category='A' 
                      skillName={skills.passiveA} 
                      skillType='passiveA'
                      options={skillOptions.passivesA}
                      effect={passives.A[skills.passiveA] ? passives.A[skills.passiveA].effect : ''} 
                      inheritList={this.getInheritList(this.props.unitName,skills.passiveA,'passiveA')}
                      cost={calcCost(this.props.unitName, this.props.skills.passiveA)}
                      usePortraits={this.props.usePortraits}
                      showDesc={this.props.showDesc}
                      showMinRarity={this.props.showMinRarity}
                      onSkillSelect={this.handleSkillSelect} />
        <SkillInfoRow category='B' 
                      skillName={skills.passiveB} 
                      skillType='passiveB'
                      options={skillOptions.passivesB}
                      effect={passives.B[skills.passiveB] ? passives.B[skills.passiveB].effect : ''} 
                      inheritList={this.getInheritList(this.props.unitName,skills.passiveB,'passiveB')}
                      cost={calcCost(this.props.unitName, this.props.skills.passiveB)}
                      usePortraits={this.props.usePortraits}
                      showDesc={this.props.showDesc}
                      showMinRarity={this.props.showMinRarity}
                      onSkillSelect={this.handleSkillSelect} />
        <SkillInfoRow category='C' 
                      skillName={skills.passiveC} 
                      skillType='passiveC'
                      options={skillOptions.passivesC}
                      effect={passives.C[skills.passiveC] ? passives.C[skills.passiveC].effect : ''} 
                      inheritList={this.getInheritList(this.props.unitName,skills.passiveC,'passiveC')}
                      cost={calcCost(this.props.unitName, this.props.skills.passiveC)}
                      usePortraits={this.props.usePortraits}
                      showDesc={this.props.showDesc}
                      showMinRarity={this.props.showMinRarity}
                      onSkillSelect={this.handleSkillSelect} />
        <SkillInfoRow category='S' 
                      skillName={skills.seal} 
                      skillType='seal'
                      options={skillOptions.seals}
                      effect={seals[skills.seal] ? seals[skills.seal].effect : ''}
                      inheritList={[]}
                      cost={0}
                      usePortraits={this.props.usePortraits}
                      showDesc={this.props.showDesc}
                      showMinRarity={this.props.showMinRarity}
                      onSkillSelect={this.handleSkillSelect} />
      </table>
    )
  }
}

class UnitInfo extends Component {
  constructor(props) {
    super(props);

    let unitList = Object.keys(units).sort(unitSortFn['name']);

    this.state = {
      unitList: unitList
    };

    this.handleUnitSelect = this.handleUnitSelect.bind(this);
    this.handleBoonSelect = this.handleBoonSelect.bind(this);
    this.handleBaneSelect = this.handleBaneSelect.bind(this);
    this.handleLevelSelect = this.handleLevelSelect.bind(this);
    this.handleMergeSelect = this.handleMergeSelect.bind(this);
    this.handleSupportRankSelect = this.handleSupportRankSelect.bind(this);
  }

  handleUnitSelect(unitName) {
    this.props.onUnitSelect(unitName);
  }

  handleLevelSelect(level) {
    this.props.onLevelSelect(level);
  }

  handleBoonSelect(boon) {
    this.props.onBoonBaneSelect("boon", boon ? boon.slice(1) : '');
  }

  handleMergeSelect(mergeBonus) {
    this.props.onMergeSelect(mergeBonus ? mergeBonus.slice(1) : 0);
  }

  handleSupportRankSelect(rank) {
    this.props.onSupportRankSelect(rank);
  }

  handleBaneSelect(bane) {
    this.props.onBoonBaneSelect("bane", bane ? bane.slice(1) : '');
  }

  render() {
    let name = this.props.state.unitName;
    let color = units[name].color;
    let wpnType = units[name].wpnType;
    let movType = units[name].movType;
    let fullWpnType = color + ' ' + wpnType;
    let bOptions = ["", "HP", "Atk", "Spd", "Def", "Res"];
    let lvOptions = [];

    switch (getLowestRarity(this.props.state.unitName)) {
      case 1:
        lvOptions = ['1★40', '1★1'];
        // eslint-disable-next-line
      case 2:
        lvOptions = ['2★40', '2★1'].concat(lvOptions);
        // eslint-disable-next-line
      case 3:
        lvOptions = ['3★40', '3★1'].concat(lvOptions);
        // eslint-disable-next-line
      case 4:
        lvOptions = ['4★40', '4★1'].concat(lvOptions);
        // eslint-disable-next-line
      default:
        lvOptions = ['5★40', '5★1'].concat(lvOptions);
    }

    return (
      <div>
        <div className="unit-info-container">
          <img className="unit-portrait" src={unitPortrait[normalizeName(this.props.state.unitName)]} title={this.props.state.unitName} alt={this.props.state.unitName} />
        </div>
        <div className="unit-info-container">
          <table>
            <tbody>
              <tr>
                <th className="unit-name text-left dropdown-header">Name</th>
                <th className="unit-type" colSpan="2">Type</th>
              </tr>
              <tr>
                <td>
                  <Dropdown addClass='unitName'
                            options={this.state.unitList}
                            value={this.props.state.unitName}
                            onChange={this.handleUnitSelect} />
                </td>
                <td className="unit-type-sub"><img src={weaponIcon[color][wpnType]} title={fullWpnType} alt={fullWpnType} /></td>
                <td className="unit-type-sub"><img src={moveIcon[movType]} title={movType} alt={movType} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="unit-info-container">
          <table>
            <tbody>
              <tr>
                <th className="unit-level">Level</th>
                <th className="unit-merge">Merge</th>
                <th className="unit-support" title="Summoner Support Rank">Rank</th>
                <th className="unit-bb">Boon</th>
                <th className="unit-bb">Bane</th>
              </tr>
              <tr>
                <td title="Rarity and Level">
                  <Dropdown addClass='unitLevel'
                            options={lvOptions}
                            value={this.props.state.rarity + '★' + this.props.state.level}
                            onChange={this.handleLevelSelect} />
                </td>
                <td>
                  <Dropdown addClass='unitMerge'
                            options={[...Array(11).keys()].map(x => { return x ? '+' + x : ''; })}
                            value={'+' + this.props.state.merge}
                            onChange={this.handleMergeSelect} />
                </td>
                <td title="Summoner Support Rank">
                  <Dropdown addClass="unitSupport"
                            options={[' ', 'C', 'B', 'A', 'S']}
                            value={this.props.state.supportRank}
                            onChange={this.handleSupportRankSelect} />
                </td>
                <td>
                  <Dropdown id="boon" addClass="unitBB"
                            options={bOptions.map(option => { return option ? '+' + option : ""; })}
                            value={'+' + this.props.state.boonBane.boon}
                            onChange={this.handleBoonSelect} />
                </td>
                <td>
                  <Dropdown id="bane" addClass="unitBB"
                            options={bOptions.map(option => { return option ? '-' + option : ""; })}
                            value={'-' + this.props.state.boonBane.bane}
                            onChange={this.handleBaneSelect} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="unit-info-container">
          <table>
            <tbody>
              <tr>
                <th className="unit-stat">HP</th>
                <th className="unit-stat">Atk</th>
                <th className="unit-stat">Spd</th>
                <th className="unit-stat">Def</th>
                <th className="unit-stat">Res</th>
                <th className="unit-BST">Total</th>
              </tr>
              <tr>
                <td className={this.props.state.boonBane.boon === "HP" ? "boon" : this.props.state.boonBane.bane === "HP" ? "bane" : ""}>{this.props.state.stats.HP}</td>
                <td className={this.props.state.boonBane.boon === "Atk" ? "boon" : this.props.state.boonBane.bane === "Atk" ? "bane" : ""}>{this.props.state.stats.Atk}</td>
                <td className={this.props.state.boonBane.boon === "Spd" ? "boon" : this.props.state.boonBane.bane === "Spd" ? "bane" : ""}>{this.props.state.stats.Spd}</td>
                <td className={this.props.state.boonBane.boon === "Def" ? "boon" : this.props.state.boonBane.bane === "Def" ? "bane" : ""}>{this.props.state.stats.Def}</td>
                <td className={this.props.state.boonBane.boon === "Res" ? "boon" : this.props.state.boonBane.bane === "Res" ? "bane" : ""}>{this.props.state.stats.Res}</td>
                <td>
                  {Object.keys(this.props.state.stats).reduce((a,b) => {
                    if (Number.isInteger(a))
                      return a + this.props.state.stats[b];
                    return this.props.state.stats[a] + this.props.state.stats[b];
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }
}

class ToggleBox extends Component {
  constructor(props) {
    super(props);

    this.handleResetClick = this.handleResetClick.bind(this);
    this.handleRawStatsToggle = this.handleRawStatsToggle.bind(this);
    this.handlePortraitToggle = this.handlePortraitToggle.bind(this);
    this.handleSkillEffectToggle = this.handleSkillEffectToggle.bind(this);
    this.handleRarityListToggle = this.handleRarityListToggle.bind(this);
  }
  
  handleResetClick() {
    this.props.onResetClick();
  }

  handleRawStatsToggle(e) {
    this.props.onRawStatsToggle(e.target.checked);
  }

  handlePortraitToggle(e) {
    this.props.onPortraitToggle(e.target.checked);
  }

  handleSkillEffectToggle(e) {
    this.props.onSkillEffectToggle(e.target.checked);
  }

  handleRarityListToggle(e) {
    this.props.onRarityListToggle(e.target.checked);
  }

  render() {
    return (
      <div>
        <div className="toggle" title="Reset skills to default">
          <label>
            <input type="button" onClick={this.handleResetClick} />
            <div className="toggle-label noselect">Reset</div>
          </label>
        </div>
        <div className="toggle" title="Display raw stats">
          <label>
            <input type="checkbox" onChange={this.handleRawStatsToggle} />
            <div className="toggle-label noselect">Raw Stats</div>
          </label>
        </div>
        <div className="toggle" title="Use unit portraits in the inheritance list">
          <label>
            <input type="checkbox" checked={!!this.props.usePortraits} onChange={this.handlePortraitToggle} />
            <div className="toggle-label noselect">Portraits</div>
          </label>
        </div>
        <div className="toggle" title="Display the Skill Effect column">
          <label>
            <input type="checkbox" checked={!!this.props.showDesc} onChange={this.handleSkillEffectToggle} />
            <div className="toggle-label noselect">Effects</div>
          </label>
        </div>
        <div className="toggle" title="Only display lowest rarity in list">
          <label>
            <input type="checkbox" checked={!!this.props.showMinRarity} onChange={this.handleRarityListToggle} />
            <div className="toggle-label noselect">Min. Rarity</div>
          </label>
        </div>
      </div>
    )
  }
}

class InheritanceTool extends Component {
  constructor(props) {
    super(props);

    let initUnit = getRandomUnit();
    
    let skills = units[initUnit].skills;
    let initSkills = {
        weapon: skills.weapon ? skills.weapon[skills.weapon.length-1].name : '',
        upgrade: '',
        assist: skills.assist ? skills.assist[skills.assist.length-1].name : '',
        special: skills.special ? skills.special[skills.special.length-1].name : '',
        passiveA: skills.passiveA ? skills.passiveA[skills.passiveA.length-1].name : '',
        passiveB: skills.passiveB ? skills.passiveB[skills.passiveB.length-1].name : '',
        passiveC: skills.passiveC ? skills.passiveC[skills.passiveC.length-1].name : '',
        seal: ''
      };

    this.state = {
      unitName: initUnit,
      rarity: 5,
      level: 40,
      boonBane: {"boon":"","bane":""},
      merge: 0,
      supportRank: '',
      stats: calcStats(initUnit, initSkills),
      skills: initSkills,
      rawStatsOn: false,
      usePortraits: storageAvailable('localStorage') && localStorage.usePortraits && JSON.parse(localStorage.usePortraits),
      showDesc: (storageAvailable('localStorage') && localStorage.showDesc) ? JSON.parse(localStorage.showDesc) : true,
      showMinRarity: (storageAvailable('localStorage') && localStorage.showMinRarity) && JSON.parse(localStorage.showMinRarity),
      totalCost: calcTotalCost(initUnit, initSkills)
    }

    this.handleUnitSelect = this.handleUnitSelect.bind(this);
    this.handleBoonBaneSelect = this.handleBoonBaneSelect.bind(this);
    this.handleLevelSelect = this.handleLevelSelect.bind(this);
    this.handleMergeSelect = this.handleMergeSelect.bind(this);
    this.handleSupportRankSelect = this.handleSupportRankSelect.bind(this);
    this.handleSkillSelect = this.handleSkillSelect.bind(this);
    this.handleResetClick = this.handleResetClick.bind(this);
    this.handleRawStatsToggle = this.handleRawStatsToggle.bind(this);
    this.handlePortraitToggle = this.handlePortraitToggle.bind(this);
    this.handleSkillEffectToggle = this.handleSkillEffectToggle.bind(this);
    this.handleRarityListToggle = this.handleRarityListToggle.bind(this);
    this.handleBuildLoad = this.handleBuildLoad.bind(this);
  }

  getNewStats({unit = '', skills = null, boonBane = null, merge = 0, rank = ''} = {}) {
    return calcStats(
      unit ? unit : this.state.unitName,
      this.state.rawStatsOn ? null
                            : skills ? skills : this.state.skills,
      this.state.rarity,
      this.state.level,
      boonBane ? boonBane : this.state.boonBane,
      (merge || merge === '') ? merge : this.state.merge,
      rank ? rank : this.state.supportRank
    )
  }

  updateStats() {
    this.setState({ stats: this.getNewStats() });
  }

  handleUnitSelect(unitName) {
    let newSkills = parseSkills(JSON.parse(JSON.stringify(units[unitName].skills)));
    newSkills.upgrade = '';

    this.setState({
      unitName: unitName,
      boonBane: { boon: '', bane: ''},
      merge: 0,
      supportRank: '',
      skills: newSkills,
      totalCost: calcTotalCost(unitName, newSkills)
    }, this.updateStats);
  }

  handleBoonBaneSelect(boonOrBane, value) {
    let newBoonBane = this.state.boonBane;
    newBoonBane[boonOrBane] = value.slice(0,1) + (value.length > 2 ? value.slice(1).toLowerCase() : value.slice(1));

    let other = boonOrBane === 'boon' ? 'bane' : 'boon';
    if (newBoonBane[other] === newBoonBane[boonOrBane])
      newBoonBane[other] = '';

    this.setState({
      boonBane: newBoonBane
    }, this.updateStats);
  }

  // {Rarity}★{Level}
  handleLevelSelect(level) {
    this.setState({
      rarity: parseInt(/^\d+/.exec(level)[0], 10),
      level: parseInt(/\d+$/.exec(level)[0], 10)
    }, this.updateStats);
  }

  handleMergeSelect(mergeBonus) {
    this.setState({
      merge: mergeBonus
    }, this.updateStats);
  }

  handleSupportRankSelect(rank) {
    this.setState({
      supportRank: rank
    }, this.updateStats);
  }

  handleSkillSelect(skillName, skillType) {
    let newSkills = JSON.parse(JSON.stringify(this.state.skills));
    switch(skillType) {
      case 'weapon':
        newSkills.weapon = skillName;
        newSkills.upgrade = '';
        break;
      case 'upgrade':
        newSkills.upgrade = skillName;
        break;
      case 'assist':
        newSkills.assist = skillName;
        break;
      case 'special':
        newSkills.special = skillName;
        break;
      case 'passiveA':
        newSkills.passiveA = skillName;
        break;
      case 'passiveB':
        newSkills.passiveB = skillName;
        break;
      case 'passiveC':
        newSkills.passiveC = skillName;
        break;
      case 'seal':
        newSkills.seal = skillName;
        break;
      default:
        break;
    }

    this.setState({
      skills: newSkills,
      totalCost: calcTotalCost(this.state.unitName, newSkills)
    }, this.updateStats);
  }

  handleResetClick() {
    let skills = parseSkills(JSON.parse(JSON.stringify(units[this.state.unitName].skills)));
    this.setState({
      skills: skills,
      totalCost: calcTotalCost(this.state.unitName, skills)
    }, this.updateStats)
  }

  handleRawStatsToggle(isOn) {
    this.setState({ rawStatsOn: isOn }, this.updateStats);
  }

  handlePortraitToggle(isOn) {
    if (storageAvailable('localStorage')) {
      localStorage.usePortraits = (isOn);
    }
    this.setState({
      usePortraits: isOn
    });
  }

  handleSkillEffectToggle(isOn) {
    if (storageAvailable('localStorage')) {
      localStorage.showDesc = JSON.stringify(isOn);
    }
    this.setState({
      showDesc: isOn
    });
  }

  handleRarityListToggle(isOn) {
    if (storageAvailable('localStorage')) {
      localStorage.showMinRarity = JSON.stringify(isOn);
    }
    this.setState({
      showMinRarity: isOn
    });
  }

  handleBuildLoad(build) {
    let newBoonBane = {
      boon: build.Boon,
      bane: build.Bane
    };
    let newSkills = {
      weapon: build.Weapon,
      upgrade: build.Upgrade,
      assist: build.Assist,
      special: build.Special,
      passiveA: build.PassiveA,
      passiveB: build.PassiveB,
      passiveC: build.PassiveC,
      seal: build.Seal
    }

    this.setState({
      boonBane: newBoonBane,
      skills: newSkills,
      totalCost: calcTotalCost(this.state.unitName, newSkills)
    }, this.updateStats);
  }

  render() {
    return (
      <div className="tool">
        <div className="toggle-box">
          <ToggleBox usePortraits={this.state.usePortraits}
                     showDesc={this.state.showDesc}
                     showMinRarity={this.state.showMinRarity}
                     onResetClick={this.handleResetClick}
                     onRawStatsToggle={this.handleRawStatsToggle}
                     onPortraitToggle={this.handlePortraitToggle}
                     onSkillEffectToggle={this.handleSkillEffectToggle}
                     onRarityListToggle={this.handleRarityListToggle} />
        </div>
        <div className="char-info">
          <UnitInfo state={this.state}
                    onUnitSelect={this.handleUnitSelect}
                    onBoonBaneSelect={this.handleBoonBaneSelect}
                    onLevelSelect={this.handleLevelSelect}
                    onMergeSelect={this.handleMergeSelect}
                    onSupportRankSelect={this.handleSupportRankSelect} />
        </div>
        <div className="skill-info">
          <SkillInfoTable unitName={this.state.unitName}
                          stats={this.state.stats}
                          skills={this.state.skills}
                          usePortraits={this.state.usePortraits}
                          showDesc={this.state.showDesc}
                          showMinRarity={this.state.showMinRarity}
                          onSkillSelect={this.handleSkillSelect} />
        </div>
        <div className="bottom-row">
          <BuildManager unitName={this.state.unitName}
                        boonBane={this.state.boonBane}
                        skills={this.state.skills}
                        onLoadClick={this.handleBuildLoad} />
          <TextBox id="totalSP" title="Total SP" text={this.state.totalCost} />
        </div>
      </div>
    );
  }
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <span>
            <span className="header">Fire Emblem: Heroes</span>
            <br />
            <span className="sub-header">Skill Inheritance Tool</span>
          </span>
        </div>
        <InheritanceTool />
        <div id="footer">
          <div id="footer-content">
            <p id="contact">
              Bug reports, feedback, or suggestions? Submit 
              an <a href="https://github.com/arghblargh/feh-inheritance-tool">issue</a> on Github or 
              message <a href="https://www.reddit.com/u/omgwtfhax_">/u/omgwtfhax_</a> on Reddit. 
              <a id="tip" href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=XLGEXXDZ8EY5A" target="_blank" rel="noopener noreferrer">
                <img src="https://arghblargh.github.io/feh-inheritance-tool/orb.png" alt="Send a tip" title="Send a tip" />
              </a>
            </p>
            <p id="disclaimer">
              <i>Fire Emblem: Heroes</i> and all respective content are the 
              sole property of Nintendo and Intelligent Systems.
            </p>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
