"use client";

import type { ReactNode } from "react";
import type { Control, FieldPath } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BikeFormInput } from "@/lib/validations/bike";

type Ctrl = Control<BikeFormInput>;
type Name = FieldPath<BikeFormInput>;

/** Placeholder value for "nothing selected" — Radix Select forbids "". */
export const NONE = "__none__";

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 px-5 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </CardContent>
    </Card>
  );
}

export function TextField({
  control,
  name,
  label,
  placeholder,
  type = "text",
  required,
  className,
  inputMode,
}: {
  control: Ctrl;
  name: Name;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && (
              <span className="text-destructive" aria-hidden="true">
                {" "}
                *
              </span>
            )}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              type={type}
              inputMode={inputMode}
              placeholder={placeholder}
              required={required}
              value={(field.value as string | null) ?? ""}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextAreaField({
  control,
  name,
  label,
  placeholder,
  className,
}: {
  control: Ctrl;
  name: Name;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              rows={3}
              placeholder={placeholder}
              value={(field.value as string | null) ?? ""}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function SelectField({
  control,
  name,
  label,
  options,
  placeholder = "Not set",
  allowEmpty = true,
  required,
}: {
  control: Ctrl;
  name: Name;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
  required?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && (
              <span className="text-destructive" aria-hidden="true">
                {" "}
                *
              </span>
            )}
          </FormLabel>
          <Select
            // Radix cannot use "" as an item value, so an explicit sentinel
            // stands in for "not set" and is mapped back to "" on change.
            value={(field.value as string | null) || (allowEmpty ? NONE : "")}
            onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {allowEmpty && <SelectItem value={NONE}>{placeholder}</SelectItem>}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CheckboxField({
  control,
  name,
  label,
}: {
  control: Ctrl;
  name: Name;
  label: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center gap-2 self-end pb-2">
          <FormControl>
            <Checkbox
              checked={Boolean(field.value)}
              onCheckedChange={(c) => field.onChange(c === true)}
            />
          </FormControl>
          <FormLabel className="font-normal">{label}</FormLabel>
        </FormItem>
      )}
    />
  );
}
