import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Collection {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  cardId: number;
}
