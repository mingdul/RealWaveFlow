// src/dto/replace-stems.dto.ts
import { Type } from 'class-transformer';
import {
  ValidateNested,
  IsArray,
} from 'class-validator';
import { CreateUpstreamDto } from './createUpstream.dto';
import { StemPairDto } from './stemPair.dto';
import { NewCategoryStemDto } from './newCategoryStem.dto';

export class StemSetCreateDto {
  @ValidateNested()
  @Type(() => CreateUpstreamDto)
  readonly upstream: CreateUpstreamDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StemPairDto)
  readonly stem_set: StemPairDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NewCategoryStemDto)
  readonly new_category_stem: NewCategoryStemDto[];
}