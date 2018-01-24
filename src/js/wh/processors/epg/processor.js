import createMIDIProcessorBase from '../../midi/processorbase';
import { PPQN } from '../../core/config';

export function createProcessor(specs, my) {
    let that,
        position = 0,
        duration = 0,
        noteDuration,
        euclidPattern = [],
        noteOffEvents = [],
        pulsesOnly = [];

    const initialize = function() {
            updatePattern(true);
        },

        terminate = function() {},
            
        /**
         * Process events to happen in a time slice.
         * timeline start        now      scanStart     scanEnd
         * |----------------------|-----------|------------|
         *                        |-----------| 
         *                        nowToScanStart
         * @param {Number} scanStart Timespan start in ticks from timeline start.
         * @param {Number} scanEnd   Timespan end in ticks from timeline start.
         * @param {Number} nowToScanStart Timespan from current timeline position to scanStart.
         * @param {Number} ticksToMsMultiplier Duration of one tick in milliseconds.
         * @param {Number} offset Time from doc start to timeline start in ticks.
         */
        process = function(scanStart, scanEnd, nowToScanStart, ticksToMsMultiplier, offset) {
                
            // if the processor is muted only process remaining note offs.
            if (my.params.is_mute.getValue()) {
                processNoteOffs(scanStart, scanEnd);
                return;
            }
            
            // if the pattern loops during this timespan.
            var localStart = scanStart % duration,
                localEnd = scanEnd % duration,
                localStart2 = false,
                localEnd2;
            if (localStart > localEnd) {
                localStart2 = 0,
                localEnd2 = localEnd;
                localEnd = duration;
            }
            
            // check if notes occur during the current timespan
            var n = pulsesOnly.length;
            for (var i = 0; i < n; i++) {
                var pulseStartTime = pulsesOnly[i].startTime,
                    scanStartToNoteStart = pulseStartTime - localStart,
                    isOn = (localStart <= pulseStartTime) && (pulseStartTime < localEnd);
                    
                // if pattern looped back to the start
                if (localStart2 !== false) {
                    scanStartToNoteStart = pulseStartTime - localStart + duration;
                    isOn = isOn || (localStart2 <= pulseStartTime) && (pulseStartTime < localEnd2);
                } 
                
                // if a note should play
                if (isOn) {
                    var channel = my.params.channel_out.getValue(),
                        pitch = my.params.pitch_out.getValue(),
                        velocity = my.params.velocity_out.getValue(),
                        pulseStartTimestamp = scanStart + scanStartToNoteStart;
                    
                    // send the Note On message
                    my.setOutputData({
                        timestampTicks: pulseStartTimestamp,
                        channel: channel,
                        type: 'noteon',
                        pitch: pitch,
                        velocity: velocity
                    });
                    
                    // store the Note Off message to send later
                    noteOffEvents.push({
                        timestampTicks: pulseStartTimestamp + noteDuration,
                        channel: channel,
                        type: 'noteoff',
                        pitch: pitch,
                        velocity: 0
                    });
                    
                    // update pattern graphic view
                    var stepIndex = pulsesOnly[i].stepIndex,
                        delayFromNowToNoteStart = (nowToScanStart + scanStartToNoteStart) * ticksToMsMultiplier,
                        delayFromNowToNoteEnd = (delayFromNowToNoteStart + noteDuration) * ticksToMsMultiplier;
                    processCallback(stepIndex, delayFromNowToNoteStart, delayFromNowToNoteEnd);
                }
            }
            
            if (localStart2 !== false) {
                localStart = localStart2;
            }
            
            processNoteOffs(scanStart, scanEnd);
        },
            
        /**
         * Check for scheduled note off events.
         * @param {Number} scanStart Timespan start in ticks from timeline start.
         * @param {Number} scanEnd   Timespan end in ticks from timeline start.
         */
        processNoteOffs = function(scanStart, scanEnd) {
            var i = noteOffEvents.length;
            while (--i > -1) {
                var noteOffTime = noteOffEvents[i].timestampTicks;
                if (scanStart <= noteOffTime && scanEnd > noteOffTime) {
                    my.setOutputData(noteOffEvents.splice(i, 1)[0]);
                }
            }
        },
            
        /**
         * Update all pattern properties.
         * @param {Boolean} isEuclidChange Steps, pulses or rotation change.
         */
        updatePattern = function(isEuclidChange) {
            // euclidean pattern properties, changes in steps, pulses, rotation
            if (isEuclidChange) {
                euclidPattern = createBjorklund(my.params.steps.getValue(), my.params.pulses.getValue());
                var elementsToShift = euclidPattern.splice(my.params.rotation.getValue());
                euclidPattern = elementsToShift.concat(euclidPattern);
            }
            
            // playback properties, changes in isTriplets, rate, noteLength
            var rate = my.params.is_triplets.getValue() ? my.params.rate.getValue() * (2 / 3) : my.params.rate.getValue(),
                stepDuration = rate * PPQN;
            noteDuration = my.params.note_length.getValue() * PPQN;
            duration = my.params.steps.getValue() * stepDuration;
            position = position % duration;
            
            // create array of note start times in ticks
            pulsesOnly.length = 0;
            var n = euclidPattern.length;
            for (var i = 0; i < n; i++) {
                if (euclidPattern[i]) {
                    pulsesOnly.push({
                        startTime: i * stepDuration,
                        stepIndex: i
                    });
                }
            }
        };

    my = my || {};
    
    that = createMIDIProcessorBase(specs, my);

    initialize();

    that.terminate = terminate;
    that.process = process;
    return that;
}