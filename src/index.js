import './styles/main.scss';
import { createMachine, interpret, assign, actions } from 'xstate';
import { start } from 'xstate/lib/actions';
import anime, { timeline } from 'animejs';
import chroma from 'chroma-js';

const startBtnText = document.querySelector('.start_btn_text');
const startBtn = document.querySelector('.start_btn_outer');
const innerStartBtn = document.querySelector('.start_btn_inner');
const textWrapper = document.querySelector('.game_title');
const startBtnContainer = document.querySelector('.start_btn');
const gridContainer = document.querySelector('.grid_container');
const resultContainer = document.querySelector('.result_container_outer');
const currentScoreContainer = resultContainer.querySelector('.currrent_score');
const highScoreContainer = resultContainer.querySelector('.high_score');
const tryAgainBtn = document.querySelector('.fa-solid');

const gameStagesMachine = createMachine(
    {
        id: 'gameStages',
        initial: 'idle',
        context: {
            elapsedGameTime: 0,
            totalMoves: 0,
            twoCardOpenedVar: false,
            highScore: 0,
            firstCard: undefined,
            secondCard: undefined,
            pairsFound: 7,
        },
        states: {
            idle: {
                on: {
                    CONTENT_LOADED: {
                        target: 'waiting',
                        actions: ['hideLoadingScreen'],
                    },
                },
            },
            waiting: {
                entry: 'showWaitingScreen',
                on: {
                    COLOR_SUBMITED: {
                        target: 'playing',
                        actions: ['hideWaitingScreen', 'showPlayingScreen'],
                    },
                },
            },
            playing: {
                initial: 'zeroCardOpened',
                invoke: {
                    src: (context) => (cb) => {
                        const interval = setInterval(() => {
                            cb('TICK');
                        }, 1000 * 0.1);

                        return () => {
                            clearInterval(interval);
                        };
                    },
                },
                on: {
                    TICK: {
                        actions: assign({
                            elapsedGameTime: (context) =>
                                +(context.elapsedGameTime + 0.1).toFixed(2),
                        }),
                    },
                },
                states: {
                    zeroCardOpened: {
                        on: {
                            COLOR_CLICKED: {
                                target: 'oneCardOpened',
                                actions: [
                                    'updateFirstCard',
                                    'changeTwoCardOpenedVarToFalse',
                                    'increaseTotalMoves',
                                ],
                            },
                        },
                    },
                    oneCardOpened: {
                        on: {
                            COLOR_CLICKED: [
                                {
                                    cond: 'clikedTheSameCard',
                                    target: 'zeroCardOpened',
                                    actions: ['resetChosenCards'],
                                },
                                {
                                    target: 'twoCardOpened',
                                    actions: ['updateSecondCard'],
                                },
                            ],
                        },
                    },
                    twoCardOpened: {
                        always: [
                            {
                                cond: 'pairIsCorrect',
                                target: 'allPairsFoundCheck',
                                actions: ['increasePairsFound'],
                            },
                            {
                                cond: 'pairIsNotCorrect',
                                target: 'zeroCardOpened',
                                actions: [
                                    'resetChosenCards',
                                    'changeTwoCardOpenedVarToTrue',
                                ],
                            },
                        ],
                    },
                    allPairsFoundCheck: {
                        always: [
                            {
                                cond: 'allPairsFoundCond',
                                target: 'allPairsFound',
                                actions: ['freezeChosenCards'],
                            },
                            {
                                target: 'zeroCardOpened',
                                actions: ['freezeChosenCards'],
                            },
                        ],
                    },
                    allPairsFound: {
                        type: 'final',
                    },
                },
                onDone: {
                    target: 'ending',
                    actions: ['showResultsScreen'],
                },
            },
            ending: {
                on: {
                    PLAY_AGAIN: {
                        target: 'ending',
                        actions: ['hideResultsScreen', 'resetContext'],
                    },
                    ANIMATION_ENDED: {
                        target: 'waiting',
                    },
                },
            },
        },
    },
    {
        actions: {
            hideLoadingScreen: (ctx) => {
                const spinner = document.querySelector('.spinner');
                spinner.classList.add('hidden');
            },
            showWaitingScreen: (ctx) => {
                console.log(ctx);
                startBtn.classList.remove('clicked');
                // Wrap every letter in a span
                textWrapper.classList.remove('hidden');
                startBtnContainer.classList.remove('hidden');
                textWrapper.innerHTML = textWrapper.textContent.replace(
                    /\S/g,
                    "<span class='letter'>$&</span>"
                );
                const timeline = anime.timeline({ loop: false }).add({
                    targets: '.game_title .letter',
                    translateX: [40, 0],
                    translateZ: 0,
                    opacity: [0, 1],
                    easing: 'easeInCirc',
                    duration: 1200,
                    delay: (el, i) => 500 + 30 * i,
                });
                animateBtn(timeline, '.start_btn', '-=800', 1100);
                hoverBtnEventListeners(startBtn, 'waiting');
            },
            hideWaitingScreen: () => {
                startBtn.classList.add('clicked');
                const timeline = anime.timeline({ loop: false });
                timeline
                    .add({
                        targets: startBtnText,
                        opacity: [1, 0],
                        easing: 'linear',
                        duration: 100,
                    })
                    .add({
                        targets: '.game_title .letter',
                        translateX: [0, -30],
                        opacity: [1, 0],
                        easing: 'easeInQuart',
                        duration: 300,
                        delay: (el, i) => 100 + 30 * i,
                        complete: function (anim) {
                            startBtnContainer.classList.add('hidden');
                            textWrapper.classList.add('hidden');
                            createGridElements(gridContainer);
                            animateBtn(
                                anime.timeline({ loop: false }),
                                '.grid_element',
                                '-=1500',
                                1000
                            );
                            const gridElements = document.querySelectorAll(
                                '.grid_element_outer'
                            );
                            gridElements.forEach((el) => {
                                hoverBtnEventListeners(el, 'playing');
                            });
                            gridContainer.classList.remove('hidden');
                        },
                    });
            },
            showPlayingScreen: () => {},
            showResultsScreen: (context) => {
                const previousHighScoreTime = localStorage.getItem('time');
                const previousHighScoreMoves = localStorage.getItem('moves');
                let highScorePhrase;
                if (
                    !previousHighScoreTime ||
                    (context.elapsedGameTime < previousHighScoreTime &&
                        context.totalMoves < previousHighScoreMoves)
                ) {
                    highScorePhrase = `New High Score!`;
                    localStorage.setItem('time', context.elapsedGameTime);
                    localStorage.setItem('moves', context.totalMoves);
                } else {
                    highScorePhrase = `High Score: ${previousHighScoreMoves} moves and ${previousHighScoreTime} seconds`;
                }
                highScoreContainer.innerHTML = highScorePhrase;
                currentScoreContainer.innerHTML = `Impressive! You completed the game in ${context.totalMoves} turns in just ${context.elapsedGameTime} seconds!`;
                hoverAnimation(context.secondCard, 1.0, 600, 300)
                    .add(
                        {
                            targets: '.grid_element_outer',
                            scale: 0,
                            opacity: [1, 0],
                            duration: 700,
                            delay: anime.stagger(50),
                            easing: 'easeInBack',
                            complete: (anim) => {
                                gridContainer.classList.add('hidden');
                                resultContainer.classList.remove('hidden');
                            },
                        },
                        '+=300'
                    )
                    .add({
                        targets: resultContainer,
                        opacity: [0, 1],
                        scale: [0, 1],
                        duration: 1000,
                    });
            },
            hideResultsScreen: () => {
                anime.timeline({ loop: false }).add({
                    targets: resultContainer,
                    scale: {
                        value: [1, 0],
                        duration: 700,
                    },
                    opacity: {
                        value: [1, 0],
                        duration: 650,
                    },
                    easing: 'easeInBack',
                    complete: (anim) => {
                        resultContainer.classList.add('hidden');
                        gameStagesService.send({ type: 'ANIMATION_ENDED' });
                    },
                });
                gridContainer.innerHTML = '';
                innerStartBtn.firstElementChild.style.opacity = 1;
            },
            resetChosenCards: (
                { firstCard, secondCard, twoCardOpenedVar },
                event,
                { state }
            ) => {
                firstCard.classList.remove('opened');
                let elementsToReset = [firstCard, secondCard];
                let timeout = 1000;
                if (!twoCardOpenedVar) {
                    elementsToReset = [firstCard];
                    timeout = 0;
                } else {
                    const timelineforShake = hoverAnimation(
                        event.element,
                        1.0,
                        600,
                        300
                    );
                    shakeAnimateBtn(timelineforShake, elementsToReset);
                }
                const allGridItems = document.querySelectorAll(
                    '.grid_element_outer'
                );
                allGridItems.forEach((gridItem) => {
                    gridItem.classList.add('clicked');
                });

                elementsToReset.forEach((element) => {
                    return new Promise(() => {
                        setTimeout(() => {
                            element.classList.remove('clicked');
                            element.firstElementChild.style.backgroundColor =
                                'black';
                            anime.timeline({ loop: false }).add({
                                targets:
                                    element.querySelector('.grid_element_text'),
                                opacity: [1, 0],
                                easing: 'linear',
                                duration: 200,
                            });
                            hoverAnimation(
                                element.firstElementChild,
                                1.0,
                                800,
                                0
                            );
                            allGridItems.forEach((gridItem) => {
                                gridItem.classList.remove('clicked');
                            });
                        }, timeout);
                    });
                });
            },
            freezeChosenCards: (
                { firstCard, secondCard, pairsFound },
                event
            ) => {
                [firstCard, secondCard].forEach((element) =>
                    element.classList.add('clicked')
                );
                if (pairsFound !== 8) {
                    hoverAnimation(secondCard, 1.0, 600, 300);
                }
            },
            updateFirstCard: assign({
                firstCard: (context, event) => {
                    event.element.classList.add('opened');
                    event.element.firstElementChild.style.backgroundColor =
                        event.element.dataset.color;
                    return event.element;
                },
            }),
            updateSecondCard: assign({
                secondCard: (context, event) => {
                    event.element.firstElementChild.style.backgroundColor =
                        event.element.dataset.color;
                    return event.element;
                },
            }),
            increasePairsFound: assign({
                pairsFound: (context, event) => context.pairsFound + 1,
            }),
            changeTwoCardOpenedVarToTrue: assign({
                twoCardOpenedVar: (context, event) => true,
            }),
            changeTwoCardOpenedVarToFalse: assign({
                twoCardOpenedVar: (context, event) => false,
            }),
            increaseTotalMoves: assign({
                totalMoves: (context, event) => context.totalMoves + 1,
            }),
            resetContext: assign({
                elapsedGameTime: 0,
                totalMoves: 0,
                twoCardOpenedVar: false,
                highScore: 0,
                firstCard: undefined,
                secondCard: undefined,
                pairsFound: 7,
            }),
        },
        guards: {
            pairIsCorrect: (context, event) => {
                return (
                    context.firstCard.dataset.color ===
                    context.secondCard.dataset.color
                );
            },
            pairIsNotCorrect: (context, event) => {
                return (
                    context.firstCard.dataset.color !==
                    context.secondCard.dataset.color
                );
            },
            allPairsFoundCond: (context, event) => context.pairsFound === 8,
            clikedTheSameCard: (context, event) => {
                return context.firstCard === event.element;
            },
        },
    }
);

// Start a service
const gameStagesService = interpret(gameStagesMachine).onTransition((state) =>
    console.log(state.value)
);
gameStagesService.start();
window.gameStagesService = gameStagesService;
window.addEventListener('DOMContentLoaded', (event) => {
    setTimeout(() => {
        gameStagesService.send({ type: 'CONTENT_LOADED' });
    }, 3000);
});

// Button entry animation logic
function animateBtn(tml, target, delay, duration) {
    tml.add(
        {
            targets: `${target}_outer`,
            scale: [0, 1],
            duration: duration,
            easing: 'easeInOutExpo',
            delay: anime.stagger(50),
        },
        '-=500'
    ).add(
        {
            targets: `${target}_inner`,
            scale: [0, 1],
            duration: duration,
            easing: 'easeInOutExpo',
            delay: anime.stagger(50),
        },
        delay
    );
}

function shakeAnimateBtn(tml, elements) {
    const xMax = 5;
    tml.add({
        targets: elements,
        easing: 'easeInOutSine',
        duration: 250,
        translateX: [
            {
                value: xMax * -1,
            },
            {
                value: xMax,
            },
            {
                value: xMax / -2,
            },
            {
                value: xMax / 2,
            },
            {
                value: 0,
            },
        ],
    });
}

// Button hover/click animation logic
let mouseDown = false;
const hoverAnimation = (el, scale, duration, elasticity) => {
    anime.remove(el);
    return anime.timeline({ loop: false }).add({
        targets: el,
        scale: scale,
        duration: duration,
        elasticity: elasticity,
    });
};
function hoverBtnEventListeners(elementBtn, elementStateType) {
    const innerElementBtn = elementBtn.firstElementChild;

    elementBtn.addEventListener(
        'mouseenter',
        () => {
            if (elementBtn.classList.contains('clicked')) {
                return;
            }
            hoverAnimation(elementBtn, 1.2, 800, 400);
        },
        false
    );
    elementBtn.addEventListener(
        'mouseleave',
        () => {
            if (elementBtn.classList.contains('clicked')) {
                return;
            }
            let innerBtnSize = 1.0;
            if (elementBtn.classList.contains('opened')) {
                innerBtnSize = 1.3;
            }
            if (mouseDown) {
                hoverAnimation(innerElementBtn, innerBtnSize, 800, 0);
            }
            hoverAnimation(elementBtn, 1.0, 600, 300);
        },
        false
    );
    elementBtn.addEventListener(
        'mousedown',
        () => {
            if (
                elementBtn.classList.contains('clicked') ||
                elementBtn.classList.contains('disabled')
            ) {
                return;
            }
            mouseDown = true;
            hoverAnimation(innerElementBtn, 0.7, 800, 400);
        },
        false
    );
    elementBtn.addEventListener(
        'mouseup',
        () => {
            if (
                elementBtn.classList.contains('clicked') ||
                elementBtn.classList.contains('disabled')
            ) {
                return;
            }
            mouseDown = false;
            let btnSizeIncrease = 1.4;
            let nextEventType = 'COLOR_SUBMITED';
            if (elementStateType === 'playing') {
                btnSizeIncrease = 1.3;
                nextEventType = 'COLOR_CLICKED';
                anime.timeline({ loop: false }).add({
                    targets: elementBtn.querySelector('.grid_element_text'),
                    opacity: [0, 1],
                    easing: 'linear',
                    duration: 200,
                });
            }
            hoverAnimation(innerElementBtn, btnSizeIncrease, 800, 0);
            gameStagesService.send({
                type: nextEventType,
                element: elementBtn,
            });
        },
        false
    );
}

tryAgainBtn.addEventListener('click', () => {
    gameStagesService.send({ type: 'PLAY_AGAIN' });
});

function shuffle(array) {
    let currentIndex = array.length,
        randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ];
    }
    return array;
}

// fetch color scheme based on a two random genereted colors and create grid elements using the colors
function createGridElements(container) {
    let colorsArray = chroma
        .scale([chroma.random(), chroma.random()])
        .mode('lch')
        .colors(8);
    colorsArray = shuffle(colorsArray.flatMap((i) => [i, i]));
    colorsArray.forEach((color) => {
        const element = `<div data-color=${color} class="start_btn_outer grid_element_outer">
                    <div class="start_btn_inner grid_element_inner"><span class="grid_element_text start_btn_text">${color}</span></div>
                </div>`;
        container.innerHTML = container.innerHTML + element;
    });
}
