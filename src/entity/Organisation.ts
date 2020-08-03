import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinTable,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm'
import { Contact } from './Contact'

@Entity()
export class Organisation {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ nullable: true })
  notes: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToMany((type) => Contact, (contact) => contact.organisations)
  @JoinTable()
  contacts: Contact[]
}
