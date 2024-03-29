class Video {
    constructor({
        videoPlayer,
        videoContainer,
        thumbnailContainer,
        seekProgress,
        seekThumb,
        timeStamp,
        playButton,
        frameRateElement,
        durationElement,
        fragmentControls,
        speedElement,
        volumeElement,
        speedInput,
        volumeInput
    }) {
        this.fragments = [];
        this.videoPlayer = videoPlayer;
        this.videoContainer = videoContainer;
        this.thumbnailContainer = thumbnailContainer;
        this.seekProgress = seekProgress;
        this.seekThumb = seekThumb;
        this.timeStamp = timeStamp;
        this.playButton = playButton;
        this.frameRateElement = frameRateElement;
        this.durationElement = durationElement;
        this.fragmentControls = fragmentControls;
        this.speedElement = speedElement;
        this.volumeElement = volumeElement;
        this.speedInput = speedInput;
        this.volumeInput = volumeInput;

        document.addEventListener('mousemove', e => this.onMouseMove(e));
        document.addEventListener('mouseup', () => {
            this.seeking = false;
        });
        this.seeking = false;
        this.shouldShowContextMenu = false;
        this.thumbnailZoom = 3;

        this.createContextMenu();
    }

    set thumbnailZoom(value) {
        this._thumbnailZoom = value;
        for (let fragment of this.fragments) {
            fragment.widthPerSecond = this.thumbnailZoom;
            fragment.updateThumbnailWidth();
        }
    }

    get thumbnailZoom() {
        return this._thumbnailZoom;
    }

    nextFrame() {
        this.pause();
        this.currentTime += 1 / this.activeFragment.fps;
    }

    previousFrame() {
        this.pause();
        this.currentTime += 1 / this.activeFragment.fps;
    }

    playLoop() {
        this.updateTime(this.currentTime);

        if (this.activeFragment.currentTime + 1 / this.activeFragment.fps > this.activeFragment.duration) {
            let currentIndex = this.fragments.indexOf(this.activeFragment);
            if (currentIndex + 1 >= this.fragments.length) {
                this.pause();
            } else {
                this.activeFragment.pause();
                this.activeFragment = this.fragments[currentIndex + 1];

                this.activeFragment.play(0);
                this.updateTime();
            }
        }
    }

    play() {
        if (!this.playing) {
            this.playButton.innerText = "pause";

            this.playing = self.setInterval(() => this.playLoop(), 1000 / 60);
            this.activeFragment.play();
        }
    }

    pause() {
        if (this.playing) {
            this.playButton.innerText = "play_arrow";

            clearInterval(this.playing);
            this.activeFragment.pause();
            delete this.playing;
        }
    }

    updateTime(value) {
        if (value === undefined)
            value = this.currentTime;

        let duration = this.duration;
        let percentage = value / duration * 100;

        this.seekThumb.style.left = `calc(${percentage}% - 7px)`;
        this.seekProgress.style.width = percentage + '%';

        this.timeStamp.innerText = Video.secondsToHms(value) + ' / ' + Video.secondsToHms(duration);

        if (this.activeFragment) {
            let thumbPercentage = this.activeFragment.currentTime / this.activeFragment.duration * 100;
            this.activeFragment.thumbnailSeeker.style.left = `calc(${thumbPercentage}% - 2px)`;

            this.speedInput.value = this.activeFragment.playbackSpeed;
            this.volumeInput.value = this.activeFragment.volume * 100;
        }

        this.updateBottomInfo();
    }

    static secondsToHms(seconds) {
        let stamp = new Date();
        stamp.setTime(seconds * 1000);

        let h = stamp.getHours();

        let m = stamp.getMinutes();
        m = m < 10 ? '0' + m : m;

        let s = stamp.getSeconds();
        s = s < 10 ? '0' + s : s;

        let cs = Math.floor(stamp.getMilliseconds() / 10);
        cs = cs < 10 ? '0' + cs : cs;

        let hms = `${m}:${s}.${cs}`;
        if (h === "0")
            hms = h + hms;

        return hms;
    }

    static hmsToSeconds(hms) {
        let [h, m, s] = hms.split(':');
        return Number(h) * 3600 + Number(m) * 60 + Number(s);
    }

    get duration() {
        let duration = 0;
        for (let fragment of this.fragments) {
            duration += fragment.duration;
        }
        return duration;
    }

    addFragments(...files) {
        if (files[0] instanceof FileList)
            files = files[0];

        this.loaded = 0;
        this.toLoad = files.length;

        for (let file of files) {
            this.addFragmentByPath(file.path);
        }
    }

    isValidPath(path) {
        let allowed = ['mp4', 'avi', 'webm', 'flv'];
        for (let format of allowed)
            if (path.toLowerCase().includes(format))
                return true;
        return false;
    }

    addFragmentByPath(path) {
        if (!this.isValidPath(path))
            return console.error("Path is not a valid video file");
        let fragment = new VideoFragment(path, this.thumbnailZoom);
        new AddFragment(this, fragment).execute();
    }

    createContextMenu() {
        require('electron-context-menu')({
            prepend: (params, browserWindow) => [{
                label: "Set start point",
                click: () => {
                    console.log("Setting start point", this.activeFragment.currentPoint, this.activeFragment.duration);
                    new SetStartPoint(this.activeFragment, this.activeFragment.currentPoint).execute();
                }
            }, {
                label: "Set end point",
                click: () => {
                    new SetEndPoint(this.activeFragment, this.activeFragment.currentPoint).execute();
                }
            }, {
                label: "Split video",
                click: () => {
                    new SplitVideo(this, this.activeFragment, this.activeFragment.currentPoint).execute();
                }
            }],
            shouldShowMenu: (e, params) => {
                let value = this.shouldShowContextMenu;
                this.shouldShowContextMenu = false;
                return value;
            },
            showInspectElement: false
        });
    }

    addFragment(fragment, index = false) {
        fragment.thumbnailSeeker.addEventListener('mousedown', e => {
            if (e.button === 2) {
                this.shouldShowContextMenu = true;
            } else if (e.button === 0) {
                this.seeking = true;
                this.onMouseMove(e);
            }
        });
        fragment.thumbnailElement.addEventListener('mouseenter', () => this.hoveringFragment = fragment);

        fragment.thumbnailElement.addEventListener('mouseup', () => {
            if (!seeking) {
                if (this.activeFragment && fragment !== this.activeFragment) {
                    this.activeFragment.currentTime = 0;
                    this.activeFragment = fragment;
                    this.pause();
                    this.updateTime();
                    fragment.addEventListener('loadedData', () => {
                        this.updateTime();
                    });
                    fragment.pause();
                }
            }
        });

        fragment.addEventListener('loadedMetadata', () => {
            if (++this.loaded === this.toLoad) {
                if (!this.activeFragment) {
                    this.currentTime = 0;
                }
            }
            this.updateTime();
        });

        fragment.addEventListener('timeChange', () => this.updateTime());

        if (index !== false) {
            this.moveFragment(fragment, index);
        } else {
            this.videoContainer.appendChild(fragment.element);
            this.thumbnailContainer.appendChild(fragment.thumbnailElement);
            this.fragments.push(fragment);
        }

        this.activeFragment = fragment;

        this.showPlayer();
    }

    get playerIsVisible() {
        return this.videoPlayer.style.display !== "none" && this.videoPlayer.style.display !== "";
    }

    showPlayer() {
        if (!this.playerIsVisible) {
            this.videoPlayer.style.display = "block";
            this.fragmentControls.style.display = "block";
        }
    }

    hidePlayer() {
        if (this.playerIsVisible) {
            this.videoPlayer.style.display = "none";
            this.fragmentControls.style.display = "none";
        }
    }

    removeFragment(fragment) {
        fragment.pause();

        if (fragment.element.parentNode)
            fragment.element.parentNode.removeChild(fragment.element);

        if (fragment.thumbnailElement.parentNode)
            fragment.thumbnailElement.parentNode.removeChild(fragment.thumbnailElement);

        let foundIndex = this.fragments.indexOf(fragment);
        if (foundIndex !== -1)
            this.fragments.splice(foundIndex, 1);

        if (this.activeFragment === fragment && this.fragments.length > 0) {
            this.activeFragment = this.fragments[Math.max(foundIndex - 1, 0)];
            console.log(1);
        }

        if (this.fragments.length === 0) {
            this.hidePlayer();
            video.activeFragment = undefined;
        } else {
            this.updateTime();
        }
    }

    static insertNodeAt(parent, newChild, desiredIndex) {
        let children = parent.children;
        if (desiredIndex === children.length) {
            parent.appendChild(newChild);
        } else {
            parent.insertBefore(newChild, children[desiredIndex]);
        }
    }

    moveFragment(fragment, index) {
        this.removeFragment(fragment);
        Video.insertNodeAt(this.thumbnailContainer, fragment.thumbnailElement, index);
        Video.insertNodeAt(this.videoContainer, fragment.element, index);
        this.fragments.splice(index, 0, fragment);
    }

    split(fragment, timePercent = 0.5) {
        console.log(this.currentTime);
        let time = this.currentTime;
        let index = this.fragments.indexOf(fragment);

        let newFragment = new VideoFragment(fragment.file, this.thumbnailZoom);
        newFragment.playbackSpeed = fragment.playbackSpeed;
        newFragment.endPoint = fragment.endPoint;
        newFragment.volume = fragment.volume;

        console.log('new splitted fragment index: ', index);
        this.addFragment(newFragment, index + 1);

        newFragment.startPoint = timePercent;
        fragment.endPoint = timePercent;

        newFragment.addEventListener("loadedData", () => {
            this.currentTime = time;
            this.updateTime();
        });

        return newFragment;
    }

    onMouseMove(e) {
        if (this.seeking && this.hoveringFragment) {
            let offset = this.hoveringFragment.thumbnailElement.getBoundingClientRect();
            let x = e.pageX - offset.left;
            let width = this.hoveringFragment.thumbnailElement.offsetWidth;

            x = x < 0 ? 0 : x;
            x = x > width ? width : x;

            let startTime = 0;
            for (let fragment of this.fragments) {
                if (fragment === this.hoveringFragment) {
                    break;
                }
                startTime += fragment.duration;
            }
            this.currentTime = startTime + this.hoveringFragment.duration * x / width;
        }
    }

    set currentTime(value) {
        if (value >= 0 && value <= this.duration) {
            let prevFragment = this.activeFragment;
            let originalValue = value;

            for (let fragment of this.fragments) {
                if (value < fragment.duration) {
                    fragment.currentTime = value;
                    this.activeFragment = fragment;
                    break;
                } else {
                    value -= fragment.duration;
                }
            }

            if (this.activeFragment !== prevFragment) {
                for (let fragment of this.fragments) {
                    if (this.activeFragment === fragment && this.playing)
                        fragment.play();
                    else
                        fragment.pause();
                }
            }

            this.updateTime(originalValue);
        }
    }

    get currentTime() {
        let time = 0;
        for (let fragment of this.fragments) {
            if (fragment === this.activeFragment) {
                return time + fragment.currentTime;
            }
            time += fragment.duration;
        }
    }

    set activeFragment(value) {
        if (value !== undefined) {
            if (this._activeFragment !== undefined && this._activeFragment !== value)
                this._activeFragment.active = false;
            value.active = true;
        }

        this.updateBottomInfo();
        this._activeFragment = value;
    }

    updateBottomInfo() {
        if (this.activeFragment) {
            this.frameRateElement.innerText = "Frame rate: " + this.activeFragment.fps;
            this.durationElement.innerText = "Duration: " + Video.secondsToHms(this.activeFragment.duration);
            this.speedElement.innerText = `Playback speed: ${this.activeFragment.playbackSpeed}x`;
            this.volumeElement.innerText = `Volume: ${Math.round(this.activeFragment.volume * 100)}%`;
        }
    }

    get activeFragment() {
        return this._activeFragment;
    }

    export({
        config = ExportConfig.default,
        overwrite = true,
        outputFile = 'output',
        clearTmpDir = true,
        onProgress = () => {
        }
    }) {
        return new Promise(resolve => {
            let i = 0;
            let secondsProcessed = [];
            let fragmentsToProcess = this.fragments.length;
            let duration = this.duration;

            node.clearDirectory(tmpDir);

            for (let fragment of this.fragments) {
                let index = false;
                fragment.export({
                    outputFile: `${tmpDir}/${i++}.${config.format}`,
                    fps: config.fps,
                    process: seconds => {
                        if (index === false) {
                            index = secondsProcessed.length;
                        }
                        secondsProcessed[index] = seconds;
                        let percentage = Math.min(duration, secondsProcessed.reduce((a, b) => a + b)) / duration;
                        onProgress(percentage);
                    }
                }).then(() => {
                    if (--fragmentsToProcess <= 0) {
                        let tempFiles = [];
                        for (let i = 0; i < this.fragments.length; i++)
                            tempFiles.push(`${i}.${config.format}`);

                        FFMPEG.concatFiles(tempFiles, `${outputFile}`, overwrite).then(() => {
                            if (clearTmpDir)
                                node.deleteDirectory(tmpDir);
                            resolve();
                        });
                    }
                });
            }
        });
    }
}