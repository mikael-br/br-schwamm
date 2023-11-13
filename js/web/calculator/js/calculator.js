/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addFoeHelperHandler('QuestsUpdated', data => {
	if ($('#costCalculator').length > 0) {
		Calculator.Show();
	}
});

let Calculator = {

	ForderBonus: 90,
    SoundFile: new Audio(extUrl + 'vendor/sounds/message.mp3'),
    PlayerName: undefined,
    LastPlayerID: 0,
    PlayInfoSound: null,
	PlayerID: undefined,           /* preserve */
	DetailViewIsNewer: false,      /* preserve */
	OpenedFromOverview: undefined, /* preserve */
	Rankings : undefined,
	CityMapEntity : undefined,
	LastRecurringQuests: undefined,
	ForderBonusPerConversation: true,
	DefaultButtons: [
		80, 85, 90, 'ark'
	],
	ClanId: null,
	ClanName: null,
	Overview : undefined,          /* preserve */
	Initalized: false,             /* preserve */

	/* --- Preserve start Open calculator --------------------------------------------- */ 
	Open: (autoClose = false) => {
		
		// Nur Übersicht verfügbar
		if (Calculator.Overview !== undefined && Calculator.CityMapEntity === undefined) {
			if ($('#LGInvestmentOverviewBox').is(':visible') && autoClose) {
				HTML.CloseOpenBox('LGInvestmentOverviewBox');
			} else {
				Calculator.ShowPossibleInvestments(false);
			}
			
		}

		// Nur Detailansicht verfügbar
		else if (Calculator.CityMapEntity !== undefined && Calculator.Overview === undefined) {
			if ($('#costCalculator').is(':visible') && autoClose) {
				HTML.CloseOpenBox('costCalculator');
			} else {
				Calculator.Show();
			}
		}

		// Beide verfügbar
		else if (Calculator.CityMapEntity !== undefined && Calculator.Overview !== undefined) {
			let BuildingInfo = Calculator.Overview.find(obj => {
				return obj['city_entity_id'] === Calculator.CityMapEntity['cityentity_id'] && obj['player']['player_id'] === Calculator.CityMapEntity['player_id'];
			});

			// Beide gehören zum selben Spieler => beide anzeigen
			if (BuildingInfo !== undefined) {
				if ($('#costCalculator').is(':visible') && $('#LGInvestmentOverviewBox').is(':visible') && autoClose) {
					HTML.CloseOpenBox('costCalculator');
					HTML.CloseOpenBox('LGInvestmentOverviewBox');
				} else {
					Calculator.Show();
					Calculator.ShowPossibleInvestments();
				}
			}

			// Unterschiedliche Spieler => Öffne die neuere Ansicht
			else {
				if ($('#costCalculator').is(':visible') && $('#LGInvestmentOverviewBox').is(':visible') && autoClose) {
					HTML.CloseOpenBox('costCalculator');
					HTML.CloseOpenBox('LGInvestmentOverviewBox');
				} else {
					if (Calculator.DetailViewIsNewer) {
						if ($('#costCalculator').is(':visible') && autoClose) {
							HTML.CloseOpenBox('costCalculator');
							HTML.CloseOpenBox('LGInvestmentOverviewBox');
						} else {
							Calculator.Show();
							HTML.CloseOpenBox('LGInvestmentOverviewBox');
						}
					}
					else {
						if ($('#LGInvestmentOverviewBox').is(':visible') && autoClose) {
							HTML.CloseOpenBox('costCalculator');
							HTML.CloseOpenBox('LGInvestmentOverviewBox');
						} else {
							Calculator.ShowPossibleInvestments();
							HTML.CloseOpenBox('costCalculator');
						}
					}
				}
			}
		}
	},
	/* --- Preserve end Open Calculator --------------------------------------------- */ 
	
	/* --- Preserve start Init Calculator --------------------------------------------- */ 
	/**
	 * Calculator Initialisieren
	 * called by looting.js
	 */
	initCalculator: () => {
		if (!Calculator.Initialized) {
			Calculator.ForderBonusPerConversation = (localStorage.getItem('CalculatorForderBonusPerConversation') !== 'false');
			
			let ct = localStorage.getItem('CalculatorTone');

			if (ct === null) {
				localStorage.setItem('CalculatorTone', 'deactivated');
				Calculator.PlayInfoSound = false;

			} else {
				Calculator.PlayInfoSound = (ct !== 'deactivated');
			}
			
			let cot = localStorage.getItem('CalculatorOverviewTone');

			if (cot === null) {
				localStorage.setItem('CalculatorOverviewTone', 'deactivated');
				Calculator.PlayOverviewInfoSound = false;

			} else {
				Calculator.PlayOverviewInfoSound = (cot !== 'deactivated');
			}
			
			Calculator.CurrentPlayer = parseInt(localStorage.getItem('current_player_id'));
			
			Calculator.OpenedFromOverview = false;
			
			Calculator.Initalized = true;
		}
		
		Calculator.PlayerID = (Calculator.DetailViewIsNewer ? Calculator.CityMapEntity['player_id'] : Calculator.Overview['0']['player']['player_id']);
		
		// Wenn sich Spieler geändert hat, dann BuildingName/PlayerName zurücksetzen
		if (Calculator.PlayerID !== Calculator.LastPlayerID) {
			Calculator.PlayerName = undefined;
			Calculator.ClanId = undefined;
			Calculator.ClanName = undefined;
		}
		
		// Übersicht vorhanden
		if (Calculator.Overview !== undefined && Calculator.CityMapEntity !== undefined) {
			// Übersicht laden + passendes LG
			let BuildingInfo = Calculator.Overview.find(obj => {
				return obj['city_entity_id'] === Calculator.CityMapEntity['cityentity_id'];
			});

			// Übersicht vom richtigen Spieler vorhanden => Spielername auslesen
			if (BuildingInfo !== undefined && BuildingInfo['player']['player_id'] === Calculator.PlayerID) {
				Calculator.OpenedFromOverview = true;
				Calculator.PlayerName = BuildingInfo['player']['name'];
			}
		}

		if (Calculator.PlayerName === undefined && PlayerDict[Calculator.PlayerID] !== undefined) {
			Calculator.PlayerName = PlayerDict[Calculator.PlayerID]['PlayerName'];
		}
		if (PlayerDict[Calculator.PlayerID] !== undefined && PlayerDict[Calculator.PlayerID]['ClanName'] !== undefined) {
			Calculator.ClanId = PlayerDict[Calculator.PlayerID]['ClanId'];
			Calculator.ClanName = PlayerDict[Calculator.PlayerID]['ClanName'];
		}
	/* --- Preserve end Init Calculator --------------------------------------------- */ 

	},
	/**
	 * Show calculator
	 *
	 * @param action
	 * @constructor
	 */
	Show: (action = '') => {
		Calculator.initCalculator();
        // moment.js global setzen
        moment.locale(MainParser.Language);

        // close at the second click
		if ($('#costCalculator').length > 0 && action === 'menu')
		{
			HTML.CloseOpenBox('costCalculator');
			return;
		}

		Calculator.ForderBonusPerConversation = (localStorage.getItem('CalculatorForderBonusPerConversation') !== 'false');

        // Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
        if ($('#costCalculator').length === 0) {
           HTML.Box({
				id: 'costCalculator',
				title: i18n('Boxes.Calculator.Title'),
				ask: i18n('Boxes.Calculator.HelpLink'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				speaker: 'CalculatorTone',
				settings: 'Calculator.ShowCalculatorSettings()'
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('calculator');

			// schnell zwischen den Prozenten wechseln
			$('#costCalculator').on('click', '.btn-toggle-arc', function () {
				Calculator.ForderBonus = parseFloat($(this).data('value'));
				$('#costFactor').val(Calculator.ForderBonus);
				let StorageKey = (Calculator.ForderBonusPerConversation && MainParser.OpenConversation ? 'CalculatorForderBonus_' + MainParser.OpenConversation : 'CalculatorForderBonus');
				localStorage.setItem(StorageKey, Calculator.ForderBonus);
				Calculator.Show();
			});

			// wenn der Wert des Archebonus verändert wird, Event feuern
			$('#costCalculator').on('blur', '#costFactor', function () {
				Calculator.ForderBonus = parseFloat($('#costFactor').val());
				let StorageKey = (Calculator.ForderBonusPerConversation && MainParser.OpenConversation ? 'CalculatorForderBonus_' + MainParser.OpenConversation : 'CalculatorForderBonus');
				localStorage.setItem(StorageKey, Calculator.ForderBonus);
				Calculator.Show();
			});

			$('#costCalculator').on('click', '#CalculatorTone', function () {

				let disabled = $(this).hasClass('deactivated');

				localStorage.setItem('CalculatorTone', (disabled ? '' : 'deactivated'));
				Calculator.PlayInfoSound = !!disabled;

				if (disabled === true) {
					$('#CalculatorTone').removeClass('deactivated');
				} else {
					$('#CalculatorTone').addClass('deactivated');
				}
			});

        }

		let ForderBonusLoaded = false;
			if(Calculator.ForderBonusPerConversation && MainParser.OpenConversation){
				let StorageKey = 'CalculatorForderBonus_' + MainParser.OpenConversation,
					StorageValue = localStorage.getItem(StorageKey);
				
				if(StorageValue !== null){
					Calculator.ForderBonus = parseFloat(StorageValue);
					ForderBonusLoaded = true;
				}
			}

			if(!ForderBonusLoaded){
				let ab = localStorage.getItem('CalculatorForderBonus');
				// alten Wert übernehmen, wenn vorhanden
				if (ab !== null) {
					Calculator.ForderBonus = parseFloat(ab);
				}
			}

		let h = [];

        // BuildingName konnte nicht aus der BuildingInfo geladen werden
		let BuildingName = MainParser.CityEntities[Calculator.CityMapEntity['cityentity_id']]['name'];
		let Level = (Calculator.CityMapEntity['level'] !== undefined ? Calculator.CityMapEntity['level'] : 0);
		let MaxLevel = (Calculator.CityMapEntity['max_level'] !== undefined ? Calculator.CityMapEntity['max_level'] : 0);

        h.push('<div class="text-center dark-bg" style="padding:5px 0 3px;">');

        // LG - Daten + Spielername
		h.push('<div class="header"><strong><span class="building-name">' + BuildingName + '</span>');

		if (Calculator.PlayerName) {
			h.push('<span class="player-name">' + MainParser.GetPlayerLink(Calculator.PlayerID, Calculator.PlayerName));

			if (Calculator.ClanName) {
				h.push(`<br>[${MainParser.GetGuildLink(Calculator.ClanId, Calculator.ClanName)}]`);
			}

			h.push('</span></strong>');
		}

        h.push('<p style="margin: 8px 0 0">'+i18n('Boxes.Calculator.Step') + '' + Level + ' &rarr; ' + (Level + 1) + ' | ' + i18n('Boxes.Calculator.MaxLevel') + ': ' + MaxLevel + '</p></div>');

                /* --- Preserve start --------------------------------------------- */ 
		// FP im Lager
		h.push('<p style="margin: 8px 0 0">' + i18n('Boxes.Calculator.AvailableFP') + ': <strong class="fp-storage">' + HTML.Format(StrategyPoints.AvailableFP) + '</p></div>');
                /* --- Preserve end --------------------------------------------- */ 

		h.push('</div>');

		h.push('<div class="dark-bg costFactorWrapper">');

		h.push(i18n('Boxes.Calculator.ArkBonus') + ': ' + MainParser.ArkBonus + '%<br>');

		h.push('<div class="btn-group">');

		// different arc bonus-buttons
		let investmentSteps = [80, 85, 90, MainParser.ArkBonus],
			customButtons = localStorage.getItem('CustomCalculatorButtons');

		// custom buttons available
		if(customButtons)
		{
			investmentSteps = [];
			let bonuses = JSON.parse(customButtons);

			bonuses.forEach(bonus => {
				if(bonus === 'ark')
				{
					investmentSteps.push(MainParser.ArkBonus);
				}
				else {
					investmentSteps.push(bonus);
				}
			})
		}

		investmentSteps = investmentSteps.filter((item, index) => investmentSteps.indexOf(item) === index); //Remove duplicates
		investmentSteps.sort((a, b) => a - b);
		investmentSteps.forEach(bonus => {
			h.push(`<button class="btn btn-default btn-toggle-arc ${(bonus === Calculator.ForderBonus ? 'btn-active' : '')}" data-value="${bonus}">${bonus}%</button>`);
		});
        h.push('</div><br>');
		/* --- Preserve start --------------------------------------------- */ 
		h.push('<table width="100%"><tr><td width="50%" style="text-align: left">');
		/* --- Preserve end --------------------------------------------- */ 
		
		h.push('<span><strong>' + i18n('Boxes.Calculator.FriendlyInvestment') + '</strong> ' + '<input type="number" id="costFactor" step="0.1" min="12" max="200" value="' + Calculator.ForderBonus + '">%</span>');

		/* --- Preserve start --------------------------------------------- */ 
		h.push('</td><td style="text-align: right">');
		h.push('<strong>' + i18n('Boxes.Calculator.AggressiveInvestment') + '</strong><br>');
		h.push('</td></tr></table>');
		/* --- Preserve end --------------------------------------------- */ 

       h.push('</div>');

        // Tabelle zusammen fummeln
		h.push('<table id="costTableFordern" style="width:100%" class="foe-table"></table>');

        // Wieviel fehlt noch bis zum leveln?
		let rest = (Calculator.CityMapEntity['state']['invested_forge_points'] === undefined ? Calculator.CityMapEntity['state']['forge_points_for_level_up'] : Calculator.CityMapEntity['state']['forge_points_for_level_up'] - Calculator.CityMapEntity['state']['invested_forge_points']);

		h.push('<div class="text-center dark-bg" style="padding-top:5px;padding-bottom:5px;"><em>' + i18n('Boxes.Calculator.Up2LevelUp') + ': <span id="up-to-level-up" style="color:#FFB539">' + HTML.Format(rest) + '</span> ' + i18n('Boxes.Calculator.FP') + '</em></div>');

		h.push(Calculator.GetRecurringQuestsLine(Calculator.PlayInfoSound));

        // in die bereits vorhandene Box drücken
        $('#costCalculator').find('#costCalculatorBody').html(h.join(''));
        $('#costCalculator').find('.tooltip').remove();

        // Stufe ist noch nicht freigeschaltet
		if (Calculator.CityMapEntity['level'] === Calculator.CityMapEntity['max_level']) {
            $('#costCalculator').find('#costCalculatorBody').append($('<div />').addClass('lg-not-possible').attr('data-text', i18n('Boxes.Calculator.LGNotOpen')));
		}

		// es fehlt eine Straßenanbindung
		else if (Calculator.CityMapEntity['connected'] === undefined) {
            $('#costCalculator').find('#costCalculatorBody').append($('<div />').addClass('lg-not-possible').attr('data-text', i18n('Boxes.Calculator.LGNotConnected')));
        }

        Calculator.CalcBody();
	},


	/**
	 * Zeile für Schleifenquests generieren
	 * *
	 * */
	GetRecurringQuestsLine: (PlaySound) => {
		let h = [],
			RecurringQuests = 0;

		// Schleifenquest für "Benutze FP" suchen
		for (let Quest of MainParser.Quests) {
			if (Quest.id >= 900000 && Quest.id < 1000000) {
				for (let cond of Quest.successConditions) {
					let CurrentProgress = cond.currentProgress || 0;
					let MaxProgress = cond.maxProgress;
					if (cond.iconType=="icon_quest_alchemie" && ((CurrentEraID <= 3 && MaxProgress >= 3) || (MaxProgress > 15 && CurrentEraID <=15) || MaxProgress>=100)) { // Unterscheidung Buyquests von UseQuests: Bronze/Eiszeit haben nur UseQuests, Rest hat Anzahl immer >15, Buyquests immer <=15
						let RecurringQuestString;
						if (MaxProgress - CurrentProgress !== 0) {
							RecurringQuestString = HTML.Format(MaxProgress - CurrentProgress) + i18n('Boxes.Calculator.FP');
							RecurringQuests += 1;
						}
						else {
							RecurringQuestString = i18n('Boxes.Calculator.Done');
						}

						h.push('<div class="text-center dark-bg" style="padding:3px 0;"><em>' + i18n('Boxes.Calculator.ActiveRecurringQuest') + ' <span id="recurringquests" style="color:#FFB539">' + RecurringQuestString + '</span></em></div>');
					}
				}
			}
		}

		if (Calculator.LastRecurringQuests !== undefined && RecurringQuests !== Calculator.LastRecurringQuests) { //Schleifenquest gestartet oder abgeschlossen
			if (PlaySound) { //Nicht durch Funktion PlaySound ersetzen!!! GetRecurringQuestLine wird auch vom EARechner aufgerufen.
				if (Settings.GetSetting('EnableSound')) Calculator.SoundFile.play();
			}
        }

		Calculator.LastRecurringQuests = RecurringQuests;

		return h.join('');
	},


	/**
	 * The table body with all functions
	 */
	CalcBody: ()=> {
		let hFordern = [],
			BestKurs = 999999,
			arc = 1 + (MainParser.ArkBonus / 100),
			ForderArc = 1 + (Calculator.ForderBonus / 100);

        let EigenPos,
            EigenBetrag = 0;

        // Ränge durchsteppen, Suche nach Eigeneinzahlung
		for (let i = 0; i < Calculator.Rankings.length;i++) {
			if (Calculator.Rankings[i]['player']['player_id'] !== undefined && Calculator.Rankings[i]['player']['player_id'] === ExtPlayerID) {
                EigenPos = i;
				EigenBetrag = (isNaN(parseInt(Calculator.Rankings[i]['forge_points']))) ? 0 : parseInt(Calculator.Rankings[i]['forge_points']);
                break;
            }
		}

		let ForderStates = [],
			SaveStates = [],
			FPNettoRewards = [],
			FPRewards = [],
			BPRewards = [],
			MedalRewards = [],
			ForderFPRewards = [],
			ForderRankCosts = [],
			SaveRankCosts = [],
			Einzahlungen = [],
			BestKursNettoFP = 0,
			BestKursEinsatz = 999999,
			BestGewinn = -999999,
			SaveLastRankCost = undefined;

		for (let i = 0; i < Calculator.Rankings.length; i++)
		{
			let Rank,
				CurrentFP,
				TotalFP,
				RestFP,
				IsSelf = false;

			if (Calculator.Rankings[i]['rank'] === undefined || Calculator.Rankings[i]['rank'] === -1) {
				continue;
			}
			else {
				Rank = Calculator.Rankings[i]['rank'] - 1;
			}

			if (Calculator.Rankings[i]['reward'] === undefined) break; // Ende der Belohnungsränge => raus

			ForderStates[Rank] = undefined; // NotPossible / WorseProfit / Self / NegativeProfit / LevelWarning / Profit
			SaveStates[Rank] = undefined; // NotPossible / WorseProfit / Self / NegativeProfit / LevelWarning / Profit
			FPNettoRewards[Rank] = 0;
			FPRewards[Rank] = 0;
			BPRewards[Rank] = 0;
			MedalRewards[Rank] = 0;
			ForderFPRewards[Rank] = 0;
			ForderRankCosts[Rank] = undefined;
			SaveRankCosts[Rank] = undefined;
			Einzahlungen[Rank] = 0;

			if (Calculator.Rankings[i]['reward']['strategy_point_amount'] !== undefined)
				FPNettoRewards[Rank] = MainParser.round(Calculator.Rankings[i]['reward']['strategy_point_amount']);

			if (Calculator.Rankings[i]['reward']['blueprints'] !== undefined)
				BPRewards[Rank] = MainParser.round(Calculator.Rankings[i]['reward']['blueprints']);

			if (Calculator.Rankings[i]['reward']['resources']['medals'] !== undefined)
				MedalRewards[Rank] = MainParser.round(Calculator.Rankings[i]['reward']['resources']['medals']);

			FPRewards[Rank] = MainParser.round(FPNettoRewards[Rank] * arc);
			BPRewards[Rank] = MainParser.round(BPRewards[Rank] * arc);
			MedalRewards[Rank] = MainParser.round(MedalRewards[Rank] * arc);
			ForderFPRewards[Rank] = MainParser.round(FPNettoRewards[Rank] * ForderArc);

			if (EigenPos !== undefined && i > EigenPos) {
				ForderStates[Rank] = 'NotPossible';
				SaveStates[Rank] = 'NotPossible';
				continue;
			}

			if (Calculator.Rankings[i]['player']['player_id'] !== undefined && Calculator.Rankings[i]['player']['player_id'] === ExtPlayerID)
				IsSelf = true;

			if (Calculator.Rankings[i]['forge_points'] !== undefined)
				Einzahlungen[Rank] = Calculator.Rankings[i]['forge_points'];

			CurrentFP = (Calculator.CityMapEntity['state']['invested_forge_points'] !== undefined ? Calculator.CityMapEntity['state']['invested_forge_points'] : 0) - EigenBetrag;
			TotalFP = Calculator.CityMapEntity['state']['forge_points_for_level_up'];
			RestFP = TotalFP - CurrentFP;

			if (IsSelf) {
				ForderStates[Rank] = 'Self';
				SaveStates[Rank] = 'Self';

				for (let j = i + 1; j < Calculator.Rankings.length; j++) {
					//Spieler selbst oder Spieler gelöscht => nächsten Rang überprüfen
					if (Calculator.Rankings[j]['rank'] !== undefined && Calculator.Rankings[j]['rank'] !== -1 && Calculator.Rankings[j]['forge_points'] !== undefined) {
						SaveRankCosts[Rank] = MainParser.round((Calculator.Rankings[j]['forge_points'] + RestFP) / 2);
						break;
					}
				}

				if (SaveRankCosts[Rank] === undefined)
					SaveRankCosts[Rank] = MainParser.round(RestFP / 2); // Keine Einzahlung gefunden => Rest / 2

				ForderRankCosts[Rank] = Math.max(ForderFPRewards[Rank], SaveRankCosts[Rank]);
			}
			else {
				SaveRankCosts[Rank] = MainParser.round((Einzahlungen[Rank] + RestFP) / 2);
				ForderRankCosts[Rank] = Math.max(ForderFPRewards[Rank], SaveRankCosts[Rank]);
				ForderRankCosts[Rank] = Math.min(ForderRankCosts[Rank], RestFP);

				let ExitLoop = false;

				// Platz schon vergeben
				if (SaveRankCosts[Rank] <= Einzahlungen[Rank]) {
					ForderRankCosts[Rank] = 0;
					ForderStates[Rank] = 'NotPossible';
					ExitLoop = true;
				}
				else {
					if (ForderRankCosts[Rank] === RestFP) {
						ForderStates[Rank] = 'LevelWarning';
					}
					else if (ForderRankCosts[Rank] <= ForderFPRewards[Rank]) {
						ForderStates[Rank] = 'Profit';
					}
					else {
						ForderStates[Rank] = 'NegativeProfit';
					}
				}

				// Platz schon vergeben
				if (SaveRankCosts[Rank] <= Einzahlungen[Rank]) {
					SaveRankCosts[Rank] = 0;
					SaveStates[Rank] = 'NotPossible';
					ExitLoop = true;
				}
				else {
					if (SaveRankCosts[Rank] === RestFP) {
						SaveStates[Rank] = 'LevelWarning';
					}
					else if (FPRewards[Rank] < SaveRankCosts[Rank]) {
						SaveStates[Rank] = 'NegativeProfit';
					}
					else {
						SaveStates[Rank] = 'Profit';
					}
				}

				if (ExitLoop)
					continue;

				// Selbe Kosten wie vorheriger Rang => nicht belegbar
				if (SaveLastRankCost !== undefined && SaveRankCosts[Rank] === SaveLastRankCost) {
					ForderStates[Rank] = 'NotPossible';
					ForderRankCosts[Rank] = undefined;
					SaveStates[Rank] = 'NotPossible';
					SaveRankCosts[Rank] = undefined;
					ExitLoop = true;
				}
				else {
					SaveLastRankCost = SaveRankCosts[Rank];
				}

				if (ExitLoop)
					continue;

				let CurrentGewinn = FPRewards[Rank] - SaveRankCosts[Rank];
				if (CurrentGewinn > BestGewinn) {
					if (SaveStates[Rank] !== 'LevelWarning')
						BestGewinn = CurrentGewinn;
				}
				else {
					SaveStates[Rank] = 'WorseProfit';
					ForderStates[Rank] = 'WorseProfit';
				}
			}
		}

		// Tabellen ausgeben
		hFordern.push('<thead>' +
			'<th>#</th>' +
			'<th><span class="forgepoints" title="' + HTML.i18nTooltip(i18n('Boxes.Calculator.Commitment')) + '"></span></th>' +
			'<th>' + i18n('Boxes.Calculator.Profit') + '</th>' +
			'<th><span class="blueprint" title="' + HTML.i18nTooltip(i18n('Boxes.Calculator.BPs')) + '"></span></th>' +
			'<th><span class="medal" title="' + HTML.i18nTooltip(i18n('Boxes.Calculator.Meds')) + '"></span></th>' +
			/* --- Preserve start Aggressive Investment --------------------------------------------- */ 
			'<th><span class="forgepoints" title="' + HTML.i18nTooltip(i18n('Boxes.Calculator.Commitment')) + '"></span></th>' +
			'<th>' + i18n('Boxes.Calculator.Profit') + '</th>' +
			'<th>' + i18n('Boxes.Calculator.Rate') + '</th>' +
			/* --- Preserve end Aggressive Investment --------------------------------------------- */ 
			'</thead>');

		for (let Rank = 0; Rank < ForderRankCosts.length; Rank++) {
			let ForderCosts = (ForderStates[Rank] === 'Self' ? Einzahlungen[Rank] : ForderFPRewards[Rank]),
				SaveCosts = (SaveStates[Rank] === 'Self' ? Einzahlungen[Rank] : SaveRankCosts[Rank]);

			let ForderGewinn = FPRewards[Rank] - ForderCosts,
				ForderRankDiff = (ForderRankCosts[Rank] !== undefined ? ForderRankCosts[Rank] - ForderFPRewards[Rank] : 0),
				SaveGewinn = FPRewards[Rank] - SaveCosts,
				Kurs = (FPNettoRewards[Rank] > 0 ? MainParser.round(SaveCosts / FPNettoRewards[Rank] * 1000)/10 : 0);

			if (SaveStates[Rank] !== 'Self' && Kurs > 0) {
				if (Kurs < BestKurs) {
					BestKurs = Kurs;
					BestKursNettoFP = FPNettoRewards[Rank];
					BestKursEinsatz = SaveRankCosts[Rank];
				}
			}


			// Fördern

			let ColClass_foerdern,
				RankClass,
				RankText = Rank + 1, //Default: Rangnummer
				RankTooltip = [],

				EinsatzClass = (ForderFPRewards[Rank] - EigenBetrag > StrategyPoints.AvailableFP ? 'error' : ''), //Default: rot wenn Vorrat nicht ausreichend, sonst gelb
				EinsatzText = HTML.Format(ForderFPRewards[Rank]) + Calculator.FormatForderRankDiff(ForderRankDiff), //Default: Einsatz + ForderRankDiff
				EinsatzTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderCosts'), { 'nettoreward': FPNettoRewards[Rank], 'forderfactor': (100 + Calculator.ForderBonus), 'costs': ForderFPRewards[Rank] })],

				GewinnClass = (ForderGewinn >= 0 ? 'success' : 'error'), //Default: Grün wenn >= 0 sonst rot
				GewinnText = HTML.Format(ForderGewinn), //Default: Gewinn
				GewinnTooltip;

			if (ForderFPRewards[Rank] - EigenBetrag > StrategyPoints.AvailableFP) {
				EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderFPStockLow'), { 'fpstock': StrategyPoints.AvailableFP, 'costs': ForderFPRewards[Rank] - EigenBetrag, 'tooless': (ForderFPRewards[Rank] - EigenBetrag - StrategyPoints.AvailableFP) }));
			}

			if (ForderGewinn >= 0) {
				GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfit'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'safe': SaveRankCosts[Rank], 'costs': ForderFPRewards[Rank], 'profit': ForderGewinn })]
			}
			else {
				GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLoss'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'safe': SaveRankCosts[Rank], 'costs': ForderFPRewards[Rank], 'loss': 0-ForderGewinn })]
			}

			if (ForderStates[Rank] === 'Self') {
				ColClass_foerdern = 'info-row';

				RankClass = 'info';

				if (Einzahlungen[Rank] < ForderFPRewards[Rank]) {
					EinsatzClass = 'error';
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTPaidTooLess'), { 'paid': Einzahlungen[Rank], 'topay': ForderFPRewards[Rank], 'tooless': ForderFPRewards[Rank] - Einzahlungen[Rank] }));
				}
				else if (Einzahlungen[Rank] > ForderFPRewards[Rank]) {
					EinsatzClass = 'warning';
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTPaidTooMuch'), { 'paid': Einzahlungen[Rank], 'topay': ForderFPRewards[Rank], 'toomuch': Einzahlungen[Rank] - ForderFPRewards[Rank]}));
				}
				else {
					EinsatzClass = 'info';
				}

				EinsatzText = HTML.Format(Einzahlungen[Rank]);
				if (Einzahlungen[Rank] !== ForderFPRewards[Rank]) {
					EinsatzText += '/' + HTML.Format(ForderFPRewards[Rank]);
				}
				EinsatzText += Calculator.FormatForderRankDiff(ForderRankDiff);


				if (ForderRankDiff > 0 && Einzahlungen[Rank] < ForderRankCosts[Rank]) {
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderNegativeProfit'), { 'fpcount': ForderRankDiff, 'totalfp': ForderRankCosts[Rank] }));
				}
				else if (ForderRankDiff < 0) {
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTLevelWarning'), { 'fpcount': (0 - ForderRankDiff), 'totalfp': ForderRankCosts[Rank] }));
				}

				if (ForderGewinn > 0) {
					/* --- Preserve start --------------------------------------------- */ 
					GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfitSelf'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'paid': Einzahlungen[Rank], 'profit': ForderGewinn, 'safe': SaveRankCosts[Rank] })]
					/* --- Preserve end --------------------------------------------- */ 
				}
				else {
					GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLossSelf'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'paid': Einzahlungen[Rank], 'loss': 0 - ForderGewinn })]
				}

				GewinnClass = 'info';
			}
			else if (ForderStates[Rank] === 'NegativeProfit') {
				ColClass_foerdern = 'bg-red';

				RankClass = 'error';

				EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderNegativeProfit'), { 'fpcount': ForderRankDiff, 'totalfp': ForderRankCosts[Rank] }));

				GewinnClass = 'error';
			}
			else if (ForderStates[Rank] === 'LevelWarning') {
				ColClass_foerdern = 'bg-yellow';

				RankClass = '';

				if (ForderRankDiff < 0) {
					Calculator.PlaySound();
				}

				EinsatzTooltip.push(i18n('Boxes.Calculator.LevelWarning'));
				if (ForderRankDiff < 0) {
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTLevelWarning'), { 'fpcount': (0 - ForderRankDiff), 'totalfp': ForderRankCosts[Rank] }));
				}

				GewinnClass = '';
			}
			else if (ForderStates[Rank] === 'Profit') {
				ColClass_foerdern = 'bg-green';

				RankClass = 'success';

				Calculator.PlaySound();
			}
			else {
				ColClass_foerdern = 'text-grey';

				RankClass = '';

				EinsatzText = HTML.Format(ForderFPRewards[Rank]);

				GewinnText = '-';
				GewinnTooltip = [];
			}

			// BP+Meds

			ColClass = '';

			if (ForderStates[Rank] === 'NotPossible' && SaveStates[Rank] === 'NotPossible') {
				ColClass = 'text-grey';
			}
			else if (ForderStates[Rank] === 'WorseProfit' && SaveStates[Rank] === 'WorseProfit') {
				ColClass = 'text-grey';
			}
			else if (ForderStates[Rank] === 'Self' && SaveStates[Rank] === 'Self') {
				ColClass = 'info-row';
			}
			else if (ForderStates[Rank] === 'NegativeProfit' && SaveStates[Rank] === 'NegativeProfit') {
				ColClass = 'bg-red';
			}
			else if (ForderStates[Rank] === 'LevelWarning' && SaveStates[Rank] === 'LevelWarning') {
				ColClass = 'bg-yellow';
			}
			else if (ForderStates[Rank] === 'Profit' && SaveStates[Rank] === 'Profit') {
				ColClass = 'bg-green';
			}


			/* --- Preserve start  AggressiveInvestment --------------------------------------------- */
			let ColClass_loot,

				LootEinsatzClass = (SaveRankCosts[Rank] > StrategyPoints.AvailableFP ? 'error' : ''), //Default: rot wenn Vorrat nicht ausreichend, sonst gelb
				LootEinsatzText = HTML.Format(SaveRankCosts[Rank]), //Default: Einsatz
				LootEinsatzTooltip = [],

				LootGewinnClass = (SaveGewinn >= 0 ? 'success' : 'error'), //Default: Grün wenn >= 0 sonst rot
				LootGewinnText = HTML.Format(SaveGewinn), //Default: Gewinn
				LootGewinnTooltip = [],

				LootKursClass = (SaveGewinn >= 0 ? 'success' : 'error'), //Default: Grün wenn Gewinn sonst rot
				LootKursText = (SaveGewinn >= 0 ? Calculator.FormatKurs(Kurs) : '-'), //Default: Kurs anzeigen bei Gewinn
				LootKursTooltip = [];

			if (SaveRankCosts[Rank] > StrategyPoints.AvailableFP) {
				LootEinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTAggressiveInvestmentFPStockLow'), { 'fpstock': StrategyPoints.AvailableFP, 'costs': SaveRankCosts[Rank], 'tooless': (SaveRankCosts[Rank] - StrategyPoints.AvailableFP) }));
			}

			if (SaveGewinn >= 0) {
				LootGewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfit'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'costs': SaveCosts, 'profit': SaveGewinn })]
			}
			else {
				LootGewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLoss'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'costs': SaveCosts, 'loss': 0-SaveGewinn })]
			}

			if (SaveStates[Rank] === 'Self') {
				ColClass_loot = 'info-row';

				RankClass = 'info';

				if (Einzahlungen[Rank] < SaveRankCosts[Rank]) {
					LootEinsatzClass = 'error';
					LootEinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTPaidTooLess'), { 'paid': Einzahlungen[Rank], 'topay': SaveRankCosts[Rank], 'tooless': SaveRankCosts[Rank] - Einzahlungen[Rank] }));
				}
				else {
					LootEinsatzClass = 'info';
				}

				LootEinsatzText = HTML.Format(Einzahlungen[Rank]);
				if (Einzahlungen[Rank] < SaveRankCosts[Rank]) {
					LootEinsatzText += '/' + HTML.Format(SaveRankCosts[Rank]);
				}

				LootGewinnClass = 'info';
				if (SaveGewinn > 0) {
					LootGewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfitSelf'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'paid': SaveCosts, 'profit': SaveGewinn })]
				}
				else {
					LootGewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLossSelf'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'paid': SaveCosts, 'loss': 0 - SaveGewinn })]
				}

				LootKursClass = 'info';
				LootKursText = Calculator.FormatKurs(Kurs);
				LootKursTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTRate'), { 'costs': Einzahlungen[Rank], 'nettoreward': FPNettoRewards[Rank], 'rate': Kurs }));
			}
			else if (SaveStates[Rank] === 'NegativeProfit') {
				ColClass_loot = 'bg-red';
			}
			else if (SaveStates[Rank] === 'LevelWarning') {
				ColClass_loot = 'bg-yellow';

				EinsatzTooltip.push(i18n('Boxes.Calculator.LevelWarning'));
			}
			else if (SaveStates[Rank] === 'Profit') {
				ColClass_loot = 'bg-green';

				LootKursTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTRate'), { 'costs': SaveRankCosts[Rank], 'nettoreward': FPNettoRewards[Rank], 'rate': Kurs }));

				Calculator.PlaySound();
			}
			else { // NotPossible/WorseProfit
				ColClass_loot = 'text-grey';

				LootEinsatzText = '-';

				LootGewinnText = '-';
				LootGewinnTooltip = [];

				LootKursText = '-';
			}

			hFordern.push('<tr>');
			hFordern.push('<td class="text-center ' + ColClass_foerdern + '"><strong class="' + RankClass + ' td-tooltip" title="' + HTML.i18nTooltip(RankTooltip.join('<br>')) + '">' + RankText + '</strong></td>');
			hFordern.push('<td class="text-center ' + ColClass_foerdern + '"><strong class="' + EinsatzClass + ' td-tooltip" title="' + HTML.i18nTooltip(EinsatzTooltip.join('<br>')) + '">' + EinsatzText + '</strong></td>');
			hFordern.push('<td class="text-center ' + ColClass_foerdern + '"><strong class="' + GewinnClass + ' td-tooltip" title="' + HTML.i18nTooltip(GewinnTooltip.join('<br>')) + '">' + GewinnText + '</strong></td>');
			hFordern.push('<td class="text-center ' + ColClass + '">' + HTML.Format(BPRewards[Rank]) + '</td>');
			hFordern.push('<td class="text-center ' + ColClass + '">' + HTML.Format(MedalRewards[Rank]) + '</td>');
			hFordern.push('<td class="text-center ' + ColClass_loot + '"><strong class="' + LootEinsatzClass + ' td-tooltip" title="' + HTML.i18nTooltip(LootEinsatzTooltip.join('<br>')) + '">' + LootEinsatzText + '</strong></td>');
			hFordern.push('<td class="text-center ' + ColClass_loot + '"><strong class="' + LootGewinnClass + ' td-tooltip" title="' + HTML.i18nTooltip(LootGewinnTooltip.join('<br>')) + '">' + LootGewinnText + '</strong></td>');
			hFordern.push('<td class="text-center ' + ColClass_loot + '"><strong class="' + LootKursClass + ' td-tooltip" title="' + HTML.i18nTooltip(LootKursTooltip.join('<br>')) + '">' + LootKursText + '</strong></td>');
			hFordern.push('</tr>');
			/* --- Preserve end Aggressive Investment--------------------------------------------- */ 
		}

		$('#costTableFordern').html(hFordern.join(''));
		/* --- Preserve start --------------------------------------------- */ 

		Calculator.RefreshGreatBuildingsDB({
			playerId: Calculator.CityMapEntity['player_id'],
			name: Calculator.CityMapEntity['cityentity_id'],
			level: Calculator.CityMapEntity['level'],
			currentFp: Calculator.CityMapEntity['state']['invested_forge_points'],
			bestRateNettoFp: BestKursNettoFP,
			bestRateCosts: BestKursEinsatz
		});
		/* --- Preserve end --------------------------------------------- */ 

		$('.td-tooltip').tooltip({
			html: true,
			container: '#costCalculator'
		});
	},
		

	/* --- Preserve start --------------------------------------------- */ 
	/**
	 * Aktualisiert die GBs in der IndexDB
	 *
	 * */
	RefreshGreatBuildingsDB: async(GreatBuilding) => {
		await IndexDB.addUserFromPlayerDictIfNotExists(GreatBuilding['playerId'], true);

		let CurrentGB = await IndexDB.db.greatbuildings
			.where({ playerId: GreatBuilding['playerId'], name: GreatBuilding['name'] })
			.first();

		//console.log('RefreshGreatBuildingsDB playerID: '+GreatBuilding['playerId'] + ', GB name: ' + GreatBuilding['name'] + ', GB in IndexDB: ' + CurrentGB);

		if (CurrentGB === undefined) {
			await IndexDB.db.greatbuildings.add({
				playerId: GreatBuilding['playerId'],
				name: GreatBuilding['name'],
				level: GreatBuilding['level'],
				currentFp: GreatBuilding['currentFp'],
				bestRateNettoFp: GreatBuilding['bestRateNettoFp'],
				bestRateCosts: GreatBuilding['bestRateCosts'],
				date: new Date()
			});
		}
		else {
			await IndexDB.db.greatbuildings.update(CurrentGB.id, {
				level: GreatBuilding['level'],
				currentFp: GreatBuilding['currentFp'],
				bestRateNettoFp: GreatBuilding['bestRateNettoFp'],
				bestRateCosts: GreatBuilding['bestRateCosts'],
				date: new Date()
			});
		}
		/* Ende Neuer Code: */
	},
	/* --- Preserve end --------------------------------------------- */ 

	/**
	 * Formats the course
	 *
	 * @param Kurs
	 */
	FormatKurs: (Kurs) => {
		if (Kurs === 0) {
			return '-';
		}
		else {
			return HTML.Format(Kurs) + '%';
		}
	},


	/**
	 * Formats the +/- display next to the yield (if present)
	 *
	 * @param ForderRankDiff
	 */
	FormatForderRankDiff: (ForderRankDiff) => {
		if (ForderRankDiff < 0) {
			return ' <small class="text-success">' + HTML.Format(ForderRankDiff) + '</small>';
		}
		else if (ForderRankDiff === 0) {
			return '';
		}
		else { // > 0
			return ' <small class="error">+' + HTML.Format(ForderRankDiff) + '</small>';
		}
	},

		
	/**
	 * Spielt einen Sound im Calculator ab
	 *
	 * @returns {string}
	 */
    PlaySound: () => {
        if (Calculator.PlayInfoSound) {
			if (Settings.GetSetting('EnableSound')) Calculator.SoundFile.play();
        }
    },


	ShowCalculatorSettings: ()=> {
		let c = [],
			buttons,
			defaults = Calculator.DefaultButtons,
			sB = localStorage.getItem('CustomCalculatorButtons'),
			nV = `<p class="new-row">${i18n('Boxes.Calculator.Settings.newValue')}: <input type="number" class="settings-values" style="width:30px"> <span class="btn btn-default btn-green" onclick="Calculator.SettingsInsertNewRow()">+</span></p>`;


		if(sB)
		{
			// buttons = [...new Set([...defaults,...JSON.parse(sB)])];
			buttons = JSON.parse(sB);

			buttons = buttons.filter((item, index) => buttons.indexOf(item) === index); // remove duplicates
			buttons.sort((a, b) => a - b); // order
		}
		else {
			buttons = defaults;
		}


		buttons.forEach(bonus => {
			if(bonus === 'ark')
			{
				c.push(`<p class="text-center"><input type="hidden" class="settings-values" value="ark"> <button class="btn btn-default">${MainParser.ArkBonus}%</button></p>`);
			}
			else {
				c.push(`<p class="btn-group flex"><button class="btn btn-default">${bonus}%</button> <input type="hidden" class="settings-values" value="${bonus}"> <span class="btn btn-default btn-delete" onclick="Calculator.SettingsRemoveRow(this)">x</span> </p>`);
			}
		});

		// new own button
		c.push(nV);

		c.push('<p><input id="forderbonusperconversation" class="forderbonusperconversation game-cursor" ' + (Calculator.ForderBonusPerConversation ? 'checked' : '') + ' type="checkbox"> ' + i18n('Boxes.Calculator.ForderBonusPerConversation'));

		// save button
		c.push(`<hr><p><button id="save-calculator-settings" class="btn btn-default" style="width:100%" onclick="Calculator.SettingsSaveValues()">${i18n('Boxes.Calculator.Settings.Save')}</button></p>`);

		// insert into DOM
		$('#costCalculatorSettingsBox').html(c.join(''));
	},


	SettingsInsertNewRow: ()=> {
    	let nV = `<p class="new-row">${i18n('Boxes.Calculator.Settings.newValue')}: <input type="number" class="settings-values" style="width:30px"> <span class="btn btn-default btn-green" onclick="Calculator.SettingsInsertNewRow()">+</span></p>`;

		$(nV).insertAfter( $('.new-row:eq(-1)') );
	},


	SettingsRemoveRow: ($this)=> {
		$($this).closest('p').fadeToggle('fast', function(){
			$(this).remove();
		});
	},


	SettingsSaveValues: ()=> {

    	let values = [];

    	// get each visible value
		$('.settings-values').each(function(){
			let v = $(this).val().trim();

			if(v){
				if(v !== 'ark'){
					values.push( parseFloat(v) );
				} else {
					values.push(v);
				}
			}

			Calculator.ForderBonusPerConversation = $('.forderbonusperconversation').prop('checked');
			localStorage.setItem('CalculatorForderBonusPerConversation', Calculator.ForderBonusPerConversation);
		});

		// save new buttons
		localStorage.setItem('CustomCalculatorButtons', JSON.stringify(values));

		$(`#costCalculatorSettingsBox`).fadeToggle('fast', function(){
			$(this).remove();

			// reload box
			Calculator.Show();
		});
	},


	/* --- Preserve start --------------------------------------------- */ 
	/**
	 * Übersicht der LGs scannen
	 *
	 * @param DisableAudio
	 */
	ShowPossibleInvestments: async(DisableAudio)=> {

		let arc = ((parseFloat(MainParser.ArkBonus) + 100) / 100)

		// nix drin, raus
		if (Calculator.Overview === undefined)
		{
			return;
		}
		
		Calculator.initCalculator();

		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#LGInvestmentOverviewBox').length === 0 )
		{

			HTML.Box({
				id: 'LGInvestmentOverviewBox',
				title: i18n('Boxes.LGInvestmentOverviewBox.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				speaker: 'CalculatorOverviewTone'
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('calculator');

			$('#LGInvestmentOverviewBox').on('click', '#CalculatorOverviewTone', function () {

				let disabled = $(this).hasClass('deactivated');

				localStorage.setItem('CalculatorOverviewTone', (disabled ? '' : 'deactivated'));
				Calculator.PlayInfoSound = !!disabled;

				if (disabled === true) {
					$('#CalculatorOverviewTone').removeClass('deactivated');
				} else {
					$('#CalculatorOverviewTone').addClass('deactivated');
				}
			});
		}


		let h = [];

		h.push('<div class="text-center dark-bg" style="padding:5px 0 3px;">');
		h.push('<p class="head-bar">');
		
		if (Calculator.PlayerName) {
			h.push('<span class="player-name"><strong>' + MainParser.GetPlayerLink(Calculator.PlayerID, Calculator.PlayerName));

			if (Calculator.ClanName) {
				h.push(`[${MainParser.GetGuildLink(Calculator.ClanId, Calculator.ClanName)}]`);
			}
			
			h.push('</strong></span>');
		}
		

		h.push('<span class="color-description">?' +
					'<span>' +
						'<span style="color:#FFB539">' + HTML.i18nTooltip(i18n('Boxes.LGInvestmentOverviewBox.Tooltip.FoundNew')) + '</span>' +
						'<span style="color:#29b206">' + HTML.i18nTooltip(i18n('Boxes.LGInvestmentOverviewBox.Tooltip.FoundAgain')) + '</span>' +
						'<span style="color:#FF6000">' + HTML.i18nTooltip(i18n('Boxes.LGInvestmentOverviewBox.Tooltip.NoPayment')) + '</span>' +
					'</span>' +
				'</span>' +
			'</p>');
		
		if (!PlayerDict[Calculator.Overview['0']['player']['player_id']].IsActive) {
			h.push(`<p><strong class="error">${i18n(`Boxes.Calculator.${PlayerDict[Calculator.Overview['0']['player']['player_id']].IsActive === undefined ? 'PlayerActivityUnknown' : 'PlayerInactive'}`)}<strong></p>`);
		}
		
		h.push('</div>');
		h.push('<table id="OverviewTable" class="foe-table">');

		h.push('<thead>' +
			'<tr>' +
				'<th>' + i18n('Boxes.LGInvestmentOverviewBox.Building') + '</th>' +
				'<th class="text-center">' + i18n('Boxes.LGInvestmentOverviewBox.Level') + '</th>' +
				'<th class="text-center">' + i18n('Boxes.LGInvestmentOverviewBox.PaidTotal') + '</th>' +
				'<th class="text-center">' + i18n('Boxes.LGInvestmentOverviewBox.Profit') + '</th>' +
				'<th class="text-center">' + i18n('Boxes.LGInvestmentOverviewBox.Rate') + '</th>' +
			'</tr>' +
		'</thead>');

		let PlayAudio = false,
			LGFound = false;

		// alle LGs der Übersicht durchsteppen
		for (let i in Calculator.Overview)
		{
			if (Calculator.Overview.hasOwnProperty(i))
			{
				let PlayerID = Calculator.Overview[i]['player']['player_id'],
					EntityID = Calculator.Overview[i]['city_entity_id'],
					GBName = Calculator.Overview[i]['name'],
					GBLevel = Calculator.Overview[i]['level'],
					CurrentProgress = Calculator.Overview[i]['current_progress'],
					MaxProgress = Calculator.Overview[i]['max_progress'],
					Rank = Calculator.Overview[i]['rank'];

				let BestKursNettoFP = undefined,
					BestKursEinsatz = undefined,
					Gewinn = undefined,
					BestKurs = undefined,
					StrongClass;

				let CurrentGB = await IndexDB.db.greatbuildings
					.where({ playerId: PlayerID, name: EntityID })
					.first();

				// LG gefunden mit selbem Level und investierten FP => Wert bekannt
				if (CurrentGB != undefined && CurrentGB['level'] === GBLevel && CurrentGB['currentFp'] == CurrentProgress) {
					BestKursNettoFP = CurrentGB['bestRateNettoFp'];
					BestKursEinsatz = CurrentGB['bestRateCosts'];
					BestKurs = MainParser.round(BestKursEinsatz / BestKursNettoFP * 1000) / 10;
					Gewinn = MainParser.round(BestKursNettoFP * arc) - BestKursEinsatz;
				}

				let EraName = GreatBuildings.GetEraName(EntityID);

				if (CurrentProgress === undefined)
				{
					CurrentProgress = 0;
				}

				let Era = Technologies.Eras[EraName];
				let P1 = 0;
				if (GreatBuildings.Rewards[Era] && GreatBuildings.Rewards[Era][GBLevel]) {
					P1 = GreatBuildings.Rewards[Era][GBLevel];
				}

				if (Rank === undefined && P1 * arc >= (MaxProgress - CurrentProgress) / 2) // Noch nicht eingezahlt und Gewinn theoretisch noch möglich
				{
					if (Gewinn === undefined || Gewinn >= 0)
					{
						LGFound = true;
						let GewinnString = undefined,
							KursString = undefined;

						if (CurrentProgress === 0)
						{
							StrongClass = ' class="warning"'; // Möglicherweise nicht freigeschaltet
							GewinnString = HTML.Format(MainParser.round(P1 * arc) - Math.ceil((MaxProgress - CurrentProgress) / 2));
							KursString = Calculator.FormatKurs(MainParser.round(MaxProgress / P1 / 2 * 1000) / 10);
						}
						else if (Gewinn === undefined)
						{
							StrongClass = '';
							PlayAudio = true;
							GewinnString = '???';
							KursString = '???%';
						}
						else
						{
							StrongClass = ' class="success"';
							PlayAudio = true;
							GewinnString = HTML.Format(Gewinn);
							KursString = Calculator.FormatKurs(BestKurs);
						}

						h.push('<tr>');
						h.push('<td><strong' + StrongClass + '>' + (i-0+1) + ': ' + GBName + '</strong></td>');
						h.push('<td class="text-center"><strong' + StrongClass + '>' + GBLevel + '</strong></td>');
						h.push('<td class="text-center"><strong' + StrongClass + '>' + HTML.Format(CurrentProgress) + ' / ' + HTML.Format(MaxProgress) + '</strong></td>');
						h.push('<td class="text-center"><strong' + StrongClass + '>' + GewinnString + '</strong></td>');
						h.push('<td class="text-center"><strong' + StrongClass + '>' + KursString + '</strong></td>');
						h.push('</tr>');
					}
				}
			}
		}

		// Gibt was zu holen
		if (LGFound)
		{
			Calculator.PlaySound();
			
		}

		// gibt nichts zu holen
		else {
				h.push('<tr>');
			h.push('<td colspan="5" class="text-center no-investments-possible" style="padding:2px 0 3px;"><strong>');

			h.push(i18n('Boxes.LGInvestmentOverviewBox.NoInvestmentsPossible')+ '</strong></td></tr>');
		}
		h.push('</table>');

		$('#LGInvestmentOverviewBox').find('#LGInvestmentOverviewBoxBody').html(h.join(''));
		/* --- Preserve end --------------------------------------------- */ 
	}
};
