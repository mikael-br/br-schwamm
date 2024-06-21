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

FoEproxy.addHandler('HiddenRewardService', 'getOverview', (data, postData) => {
    let fromHandler = true;
    HiddenRewards.Cache = HiddenRewards.prepareData(data.responseData.hiddenRewards);

    HiddenRewards.GEprogress = JSON.parse(localStorage.getItem('HiddenRewards.GEprogress')||'0');
   
    HiddenRewards.RefreshGui(fromHandler);
    if (HiddenRewards.FirstCycle) { //Alle 60 Sekunden aktualisieren (Startbeginn des Ereignisses könnte erreicht worden sein)
        HiddenRewards.FirstCycle = false;
        setInterval(HiddenRewards.RefreshGui, 60000);
    }
});

FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
    HiddenRewards.GEprogress = data?.responseData?.progress?.currentEntityId || 0;
    localStorage.setItem('HiddenRewards.GEprogress', JSON.stringify(HiddenRewards.GEprogress));
    HiddenRewards.RefreshGui();
});

FoEproxy.addHandler('GuildExpeditionService', 'getState', (data, postData) => {
    for (let x in data.responseData) {
        if (!data.responseData.hasOwnProperty(x)) continue;
        if (!data.responseData[x].hasOwnProperty('currentEntityId')) continue;
        HiddenRewards.GEprogress = data.responseData[x].currentEntityId;
        localStorage.setItem('HiddenRewards.GEprogress', JSON.stringify(HiddenRewards.GEprogress));
        HiddenRewards.RefreshGui();
    }
});


/**
 *
 * @type {{init: HiddenRewards.init, prepareData: HiddenRewards.prepareData, BuildBox: HiddenRewards.BuildBox, RefreshGui: HiddenRewards.RefreshGui, Cache: null, FilteredCache : null, FirstCycle : true, GEprogress:0, GElookup:[0,0,1,1,1,2,2,3,3,3]}}
 */
let HiddenRewards = {

    Cache: null,
    ActiveCache : [],
    FutureCache : [],
    FirstCycle: true,
    GEprogress:0,
    GElookup:[0,0,1,1,1,2,2,3,3,3],
    
	/**
	 * Box in den DOM
	 */
    init: () => {
        if ($('#HiddenRewardBox').length < 1) {

            HTML.AddCssFile('hidden-rewards');

            HTML.Box({
                'id': 'HiddenRewardBox',
                'title': i18n('Boxes.HiddenRewards.Title'),
                'ask': i18n('Boxes.HiddenRewards.HelpLink'),
                'auto_close': true,
                'dragdrop': true,
                'minimize': true,
                'settings': 'HiddenRewards.ShowSettingsButton()'
            });

            //moment.locale(18n('Local'));

            HiddenRewards.RefreshGui();

        } else {
            HTML.CloseOpenBox('HiddenRewardBox');
        }
    },


	/**
	 * Daten aufbereiten
	 */
    prepareData: (Rewards) => {
        let data = [];
        
        for (let idx in Rewards) {
            if (!Rewards.hasOwnProperty(idx)) continue;

            let position = Rewards[idx].position.context;
            let positionX = Rewards[idx].position.position || 0;
            let isGE = false;
            let SkipEvent = true;

            // prüfen ob der Spieler in seiner Stadt eine zweispurige Straße hat
            if (position === 'cityRoadBig') {
                if (CurrentEraID >= Technologies.Eras.ProgressiveEra)
                    SkipEvent = false;
            }
            else {
                SkipEvent = false;
            }
            if (position === 'cityUnderwater') {
                SkipEvent = true;
            }

            if (position === 'guildExpedition') isGE = true;

            if (SkipEvent) {
                continue;
            }

            const positionI18nLookupKey = 'HiddenRewards.Positions.' + position;
            const positionI18nLookup = i18n('HiddenRewards.Positions.' + position);

            if (positionI18nLookupKey !== positionI18nLookup) {
                position = positionI18nLookup;
            }

            data.push({
                type: Rewards[idx].type,
                position: position,
                starts: Rewards[idx].startTime,
                expires: Rewards[idx].expireTime,
                isGE: isGE,
                positionGE: positionX
            });
        }

        data.sort(function (a, b) {
            if (a.expires < b.expires) return -1;
            if (a.expires > b.expires) return 1;
            return 0;
        });

        return data;        
    },

    /**
     * Filtert den Cache erneut basierend auf aktueller Zeit + aktualisiert Counter/Liste falls nötig
     * 
     */
    RefreshGui: (fromHandler = false) => {
        HiddenRewards.ActiveCache = [];
        HiddenRewards.ActiveCountNonGE = 0;
        HiddenRewards.FutureCache = [];
        HiddenRewards.FutureCountNonGE = 0;
        for (let i = 0; i < HiddenRewards.Cache.length; i++) {
	    let StartTime = moment.unix(HiddenRewards.Cache[i].starts|0),
		EndTime = moment.unix(HiddenRewards.Cache[i].expires|0);
            HiddenRewards.Cache[i].isVis = true;
            if (StartTime > MainParser.getCurrentDateTime() || EndTime < MainParser.getCurrentDateTime()) continue;
            if (HiddenRewards.Cache[i].isGE && !(HiddenRewards.GElookup[HiddenRewards.Cache[i].positionGE] <= Math.floor((HiddenRewards.GEprogress % 32)/8))) {
                HiddenRewards.Cache[i].isVis = false;
            }
            if (StartTime < MainParser.getCurrentDateTime() && EndTime > MainParser.getCurrentDateTime()) {
                HiddenRewards.ActiveCache.push(HiddenRewards.Cache[i]);
            } else if (StartTime > MainParser.getCurrentDateTime() && EndTime > MainParser.getCurrentDateTime()){
                HiddenRewards.FutureCache.push(HiddenRewards.Cache[i]);
            }
            
        }

        HiddenRewards.SetCounter();

        if ($('#HiddenRewardBox').length >= 1) {
            if(fromHandler && (HiddenRewards.ActiveCache.length === 0 || HiddenRewards.FutureCache.length === 0) && $('#HiddenRewardBox').length) 
            {
                $('#HiddenRewardBox').fadeOut('500', function() {
                    $(this).remove();
                });
            }
            else 
            {
                HiddenRewards.BuildBox();
            }
        }  
    },


	/**
	 * Inhalt der Box in den BoxBody legen
	 */
    BuildBox: () => {
        let h = [];

        h.push('<table class="foe-table">');

        h.push('<thead>');
        h.push('<tr>');
        h.push('<th>' + i18n('HiddenRewards.Table.type') + '</th>');
        h.push('<th>' + i18n('HiddenRewards.Table.position') + '</th>');
        h.push('<th>' + i18n('HiddenRewards.Table.expires') + '</th>');
        h.push('</tr>');
        h.push('</thead>');

        h.push('<tbody>');

        let cnt = 0;
        for (let idx in HiddenRewards.Cache) {

            if (!HiddenRewards.Cache.hasOwnProperty(idx)) {
                break;
            }

            let hiddenReward = HiddenRewards.Cache[idx];

            let StartTime = moment.unix(hiddenReward.starts|0),
                EndTime = moment.unix(hiddenReward.expires|0);

            if (EndTime > MainParser.getCurrentDateTime()) {
                h.push(`<tr ${!hiddenReward.isVis ? 'class="unavailable"':''}>`);
                let img =  hiddenReward.type;
                if (hiddenReward.type.indexOf('outpost') > -1) {
                    img = 'Shard_' + hiddenReward.type.substr(hiddenReward.type.length-2, 2);
                }
                h.push('<td class="incident" title="' + HTML.i18nTooltip(hiddenReward.type) + '"><img src="' + extUrl + 'js/web/hidden-rewards/images/' + img + '.png" alt=""></td>');
                h.push('<td>' + hiddenReward.position + '</td>');

                if (StartTime > MainParser.getCurrentDateTime()) {
                    h.push('<td class="warning">' + i18n('Boxes.HiddenRewards.Appears') + ' ' + moment.unix(hiddenReward.starts).fromNow() + '</td>');
                }
                else {
                    h.push('<td class="">' + i18n('Boxes.HiddenRewards.Disappears') + ' ' + moment.unix(hiddenReward.expires).fromNow() + '</td>');
                }

                h.push('</tr>');
                cnt++;
            }
        }
        if (cnt === 0) {
            h.push('<td colspan="3">' + i18n('Boxes.HiddenRewards.NoEvents') + '</td>');
        }

        h.push('</tbody>');

        h.push('</table>');

        $('#HiddenRewardBoxBody').html(h.join(''));
    },


	SetCounter: ()=> {
		let CountRelics = JSON.parse(localStorage.getItem('CountRelics') || 0);
		let count = HiddenRewards.GetCount(HiddenRewards.FutureCache, CountRelics);
		$('#hidden-future-reward-count').text(count);
		if(count > 0){
			$('#hidden-future-reward-count').show();
		} else {
			$('#hidden-future-reward-count').hide();
		}
		count = HiddenRewards.GetCount(HiddenRewards.ActiveCache, CountRelics);
		$('#hidden-reward-count').text(count)
		if(count > 0){
			$('#hidden-reward-count').show();
		} else {
			$('#hidden-reward-count').hide();
		}
	},


	GetCount: (list, countRelics) => {
		list = list || [];
		return count = list.filter(
			x => countRelics == 0 || 
			countRelics == 1 && x.isVis ||
			countRelics == 2 && !x.isGE
		).length;
	},

    ShowSettingsButton: () => {
        let CountRelics = JSON.parse(localStorage.getItem('CountRelics') || 0);
        let h = [];
        h.push(`<p class="text-center"><label for="countrelics">${i18n('Settings.CountRelics')}<label><br>`);
        h.push(`<select oninput="HiddenRewards.SaveSettings(this.value)"/><option value="0" ${CountRelics == 0 ? 'selected="selected"': ''}>${i18n('Boxes.HiddenRewards.CountAll')} </option><option value="1" ${CountRelics == 1 ? 'selected="selected"': ''}>${i18n('Boxes.HiddenRewards.onlyVis')} </option><option value="2" ${CountRelics == 2 ? 'selected="selected"': ''}>${i18n('Boxes.HiddenRewards.none')} </option></p>`);
        $('#HiddenRewardBoxSettingsBox').html(h.join(''));
    },

    /**
    *
    */
    SaveSettings: (value='0') => {
        localStorage.setItem('CountRelics', value);
        HiddenRewards.SetCounter();
    },
};
