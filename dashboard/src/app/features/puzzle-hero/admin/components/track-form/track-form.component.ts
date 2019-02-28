import { Component, forwardRef, Inject, OnInit } from "@angular/core";
import { FormGenerator } from "../../../../../form-generator/form-generator";
import { TRACK_FORM_GENERATOR } from "./track-form.constants";
import { TrackFormDto } from "./dto/track-form.dto";
import { Subscription } from "rxjs";
import { ControlValueAccessor, FormGroup, NG_VALUE_ACCESSOR } from "@angular/forms";
import { PuzzleTypes, Track, TrackTypes } from "../../../../../api/models/puzzle-hero";

@Component({
    selector: "app-track-form",
    templateUrl: "track-form.template.html",
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TrackFormComponent),
            multi: true
        }
    ]
})
export class TrackFormComponent implements OnInit, ControlValueAccessor {

    public types = [
        TrackTypes.Crypto,
        TrackTypes.Gaming,
        TrackTypes.Scavenger,
        TrackTypes.Sponsor
    ];

    public formGroup: FormGroup;

    constructor(@Inject(TRACK_FORM_GENERATOR) private formGenerator: FormGenerator<TrackFormDto>) { }

    private valueChangeSub$: Subscription;

    private propagate: (trackFormDto: TrackFormDto) => void;

    ngOnInit() {
        this.formGroup = this.formGenerator.generateGroup();
        this.valueChangeSub$ = this.formGroup.valueChanges.subscribe(() => {
            this.propagate(this.formGenerator.getValues());
        });
    }

    registerOnChange(fn: (trackFormDto: TrackFormDto) => void): void {
        this.propagate = fn;
    }

    registerOnTouched(fn: any): void {
        // NO-OP
    }

    writeValue(trackFormDto: TrackFormDto): void {
        if (trackFormDto) {
            this.formGenerator.patchValues(trackFormDto);
        }
    }

    getIcon(type: string): string {
        switch (type) {
            case TrackTypes.Crypto:
                return "fa-key";
            case TrackTypes.Gaming:
                return "fa-gamepad";
            case TrackTypes.Scavenger:
                return "fa-camera-alt";
            case TrackTypes.Sponsor:
                return "fa-gem";
        }
        return "";
    }

    validate(): boolean {
        if (this.formGroup.valid) {
            return true;
        }
        this.formGenerator.markAsDirty();
        return false;
    }
}
