<template>
    <div
        v-show="loading"
        class="v-spinner"
        :style="{position: 'relative', fontSize: 0}">
        <div class="v-pacman v-pacman1" :style="spinnerStyle1">
        </div>
        <div class="v-pacman v-pacman2" :style="[spinnerStyle,animationStyle,spinnerDelay2]">
        </div>
        <div class="v-pacman v-pacman3" :style="[spinnerStyle,animationStyle,spinnerDelay3]">
        </div>
        <div class="v-pacman v-pacman4" :style="[spinnerStyle,animationStyle,spinnerDelay4]">
        </div>
        <div class="v-pacman v-pacman5" :style="[spinnerStyle,animationStyle,spinnerDelay5]">
        </div>
    </div>
</template>

<script>
export default {

    name: 'PacmanLoader',

    props: {
        loading: {
            type: Boolean,
            default: true
        },
        color: {
            type: String,
            default: '#6c2957'
        },
        size: {
            type: String,
            default: '20px'
        },
        margin: {
            type: String,
            default: '2px'
        },
        radius: {
            type: String,
            default: '100%'
        }
    },
    data() {
        return {
            spinnerDelay2: {
                animationDelay: '0.3s'
            },
            spinnerDelay3: {
                animationDelay: '0.6s'
            },
            spinnerDelay4: {
                animationDelay: '0.9s'
            },
            spinnerDelay5: {
                animationDelay: '1.2s'
            }
        }
    },
    computed: {
        spinnerStyle() {
            return {
                backgroundColor: this.color,
                width: this.size,
                height: this.size,
                margin: this.margin,
                borderRadius: this.radius,
            }
        },
        border1() {
            return this.size + ' solid transparent'
        },
        border2() {
            return this.size + ' solid ' + this.color
        },
        spinnerStyle1() {
            return {
                width: 0,
                height: 0,
                borderTop: this.border2,
                borderRight: this.border1,
                borderBottom: this.border2,
                borderLeft: this.border2,
                borderRadius: this.size
            }
        },
        animationStyle() {
            return {
                width: '10px',
                height: '10px',
                transform: 'translate(0, ' + -parseFloat(this.size) / 4 + 'px)',
                position: 'absolute',
                top: '25px',
                left: '100px',
                animationName: 'v-pacmanStretchDelay',
                animationDuration: '1.2s',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'linear',
                animationFillMode: 'both'
            }
        }
    }
}
</script>

<style>
.v-spinner {
    text-align: center;
}

/*TODO computed transform */
@-webkit-keyframes v-pacmanStretchDelay {
    75% {
        -webkit-opacity: 0.7;
        opacity: 0.7;
    }
    100% {
        -webkit-transform: translate(-100px, -6.25px);
        transform: translate(-100px, -6.25px);
    }
}

@keyframes v-pacmanStretchDelay {
    75% {
        -webkit-opacity: 0.7;
        opacity: 0.7;
    }
    100% {
        -webkit-transform: translate(-100px, -6.25px);
        transform: translate(-100px, -6.25px);
    }
}
</style>
